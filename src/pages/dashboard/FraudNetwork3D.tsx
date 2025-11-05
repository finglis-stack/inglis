import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, AlertTriangle, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { showError } from '@/utils/toast';

interface NetworkNode {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string;
  lon: number;
  lat: number;
  color: string;
  suspicious: boolean;
  metadata?: any;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  suspicious: boolean;
}

interface GeoLocation {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
}

const fetchMapsApiKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
  if (!data || !data.apiKey) throw new Error('La clé API Google Maps n\'est pas configurée.');
  return data.apiKey;
};

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem',
};

const NetworkMap = ({ apiKey, nodes, edges, center, onNodeClick, selectedNode, onInfoWindowClose }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'fraud-network-map-script',
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  if (loadError) return <div className="text-red-500">Erreur de chargement de la carte.</div>;
  if (!isLoaded) return <Skeleton className="h-[600px] w-full" />;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={8}
      mapTypeId="satellite"
      options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, tilt: 45 }}
    >
      {nodes.map(node => (
        <Marker
          key={node.id}
          position={{ lat: node.lat, lng: node.lon }}
          title={node.label}
          onClick={() => onNodeClick(node)}
          icon={{
            path: 'M-8,0a8,8 0 1,0 16,0a8,8 0 1,0 -16,0',
            fillColor: node.color,
            fillOpacity: 0.9,
            strokeColor: node.suspicious ? '#ef4444' : '#ffffff',
            strokeWeight: 2,
            scale: node.suspicious ? 1.5 : 1,
          }}
        />
      ))}
      {edges.map((edge, i) => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) return null;
        return (
          <Polyline
            key={i}
            path={[{ lat: source.lat, lng: source.lon }, { lat: target.lat, lng: target.lon }]}
            options={{
              strokeColor: edge.suspicious ? "rgba(239, 68, 68, 0.7)" : "rgba(107, 114, 128, 0.5)",
              strokeOpacity: 1,
              strokeWeight: edge.suspicious ? 3 : 1.5,
              geodesic: true,
            }}
          />
        );
      })}
      {selectedNode && (
        <InfoWindow
          position={{ lat: selectedNode.lat, lng: selectedNode.lon }}
          onCloseClick={onInfoWindowClose}
        >
          <div className="p-2">
            <h4 className="font-bold">{selectedNode.label}</h4>
            <p>Type: {selectedNode.type}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

const FraudNetwork3D = () => {
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 46.8139, lng: -71.2080 }); // Québec

  const { data: apiKey, isLoading: isLoadingApiKey, isError: isApiKeyError, error: apiKeyError } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const getNodeColor = (type: string, suspicious: boolean) => {
    if (suspicious) return '#ef4444';
    switch (type) {
      case 'profile': return '#3b82f6';
      case 'card': return '#10b981';
      case 'ip': return '#f59e0b';
      case 'device': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const searchNetwork = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, legal_name, type').or(`full_name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%`).limit(10);
      const { data: cards } = await supabase.from('cards').select('id, user_initials, issuer_id, random_letters, unique_identifier, check_digit, profile_id, profiles(full_name, legal_name)').or(`user_initials.ilike.%${searchTerm}%,unique_identifier.ilike.%${searchTerm}%`).limit(10);
      const results = [
        ...(profiles || []).map(p => ({ type: 'profile', id: p.id, name: p.full_name || p.legal_name, label: `${p.full_name || p.legal_name} (Profil)` })),
        ...(cards || []).map(c => {
          const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          return { type: 'card', id: c.id, name: `${c.user_initials} ... ${c.unique_identifier.slice(-3)}`, label: `Carte ${c.user_initials}... (${profile?.full_name || profile?.legal_name})` };
        })
      ];
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      showError("Une erreur est survenue lors de la recherche.");
    } finally {
      setSearching(false);
    }
  };

  const loadNetworkForEntity = useCallback(async (entityId: string, entityType: string) => {
    setLoading(true);
    setSearchResults([]);
    setSelectedNode(null);
    try {
      let edgesData: any[] = [];
      if (entityType === 'profile') {
        const { data: profileCards } = await supabase.from('cards').select('id').eq('profile_id', entityId);
        if (profileCards && profileCards.length > 0) {
          const cardIds = profileCards.map(c => c.id);
          const { data: cardEdges } = await supabase.from('fraud_network_edges').select('*').or(cardIds.map(id => `source_id.eq.${id},target_id.eq.${id}`).join(',')).limit(100);
          edgesData = cardEdges || [];
        }
      } else {
        const { data } = await supabase.from('fraud_network_edges').select('*').or(`source_id.eq.${entityId},target_id.eq.${entityId}`).limit(50);
        edgesData = data || [];
      }

      if (edgesData.length === 0) {
        setNodes([]); setEdges([]); setLoading(false); return;
      }

      const ipAddresses = new Set<string>();
      edgesData.forEach(edge => {
        if (edge.source_type === 'ip') ipAddresses.add(edge.source_id);
        if (edge.target_type === 'ip') ipAddresses.add(edge.target_id);
      });

      const ipLocations = new Map<string, GeoLocation>();
      if (ipAddresses.size > 0) {
        const { data: ipData, error: ipError } = await supabase.from('ip_addresses').select('ip_address, geolocation, city, country').in('ip_address', Array.from(ipAddresses));
        if (ipError) throw ipError;
        ipData.forEach(ip => {
          if (ip.geolocation?.lat && ip.geolocation?.lon) {
            ipLocations.set(ip.ip_address, { lat: ip.geolocation.lat, lon: ip.geolocation.lon, city: ip.city, country: ip.country });
          }
        });
      }

      const geoNodes: { lat: number; lon: number }[] = Array.from(ipLocations.values());
      let centerLat = 45.5017, centerLon = -73.5673;
      if (geoNodes.length > 0) {
        centerLat = geoNodes.reduce((sum, node) => sum + node.lat, 0) / geoNodes.length;
        centerLon = geoNodes.reduce((sum, node) => sum + node.lon, 0) / geoNodes.length;
      }
      setMapCenter({ lat: centerLat, lng: centerLon });

      const nodeMap = new Map<string, NetworkNode>();
      const nonGeoNodeInfos: any[] = [];
      const allNodeInfos = new Map<string, any>();
      edgesData.forEach(edge => {
        if (!allNodeInfos.has(edge.source_id)) allNodeInfos.set(edge.source_id, { id: edge.source_id, type: edge.source_type, suspicious: edge.is_suspicious });
        if (!allNodeInfos.has(edge.target_id)) allNodeInfos.set(edge.target_id, { id: edge.target_id, type: edge.target_type, suspicious: edge.is_suspicious });
      });

      allNodeInfos.forEach(nodeInfo => {
        if (nodeInfo.type === 'ip' && ipLocations.has(nodeInfo.id)) {
          const loc = ipLocations.get(nodeInfo.id)!;
          nodeMap.set(nodeInfo.id, { id: nodeInfo.id, type: nodeInfo.type, label: `${nodeInfo.type}: ${nodeInfo.id}`, lat: loc.lat, lon: loc.lon, color: getNodeColor(nodeInfo.type, nodeInfo.suspicious), suspicious: nodeInfo.suspicious || false, metadata: loc });
        } else {
          nonGeoNodeInfos.push(nodeInfo);
        }
      });

      const radius = 0.05;
      const angleStep = nonGeoNodeInfos.length > 0 ? (2 * Math.PI) / nonGeoNodeInfos.length : 0;
      nonGeoNodeInfos.forEach((nodeInfo, i) => {
        const angle = i * angleStep;
        const lat = centerLat + radius * Math.cos(angle);
        const lon = centerLon + radius * Math.sin(angle);
        nodeMap.set(nodeInfo.id, { id: nodeInfo.id, type: nodeInfo.type, label: `${nodeInfo.type}: ${nodeInfo.id.substring(0, 8)}...`, lat, lon, color: getNodeColor(nodeInfo.type, nodeInfo.suspicious), suspicious: nodeInfo.suspicious || false });
      });

      setNodes(Array.from(nodeMap.values()));
      setEdges(edgesData.map(edge => ({ source: edge.source_id, target: edge.target_id, weight: edge.weight || 1, suspicious: edge.is_suspicious || false })));
    } catch (error) {
      console.error('Error loading network:', error);
      showError("Une erreur est survenue lors du chargement du réseau de fraude.");
    } finally {
      setLoading(false);
    }
  }, []);

  const renderMapContent = () => {
    if (isLoadingApiKey) return <Skeleton className="h-[600px] w-full" />;
    if (isApiKeyError) return <div className="text-red-500">Erreur de clé API: {apiKeyError.message}</div>;
    if (!apiKey) return <div className="text-muted-foreground">Clé API non disponible.</div>;

    return (
      <NetworkMap
        apiKey={apiKey}
        nodes={nodes}
        edges={edges}
        center={mapCenter}
        selectedNode={selectedNode}
        onNodeClick={setSelectedNode}
        onInfoWindowClose={() => setSelectedNode(null)}
      />
    );
  };

  if (loading && nodes.length === 0) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Network className="h-8 w-8" />Réseau de Fraude</h1>
          <p className="text-muted-foreground">Visualisation géographique des connexions suspectes</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Rechercher une entité</CardTitle>
          <CardDescription>Entrez un nom de profil ou un identifiant de carte pour visualiser son réseau.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Ex: Jean Dupont ou LT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchNetwork()} />
            <Button onClick={searchNetwork} disabled={searching}>{searching ? 'Recherche...' : 'Rechercher'}</Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Résultats:</p>
              {searchResults.map((result) => (
                <Button key={result.id} variant="outline" className="w-full justify-start" onClick={() => loadNetworkForEntity(result.id, result.type)}>
                  <MapPin className="h-4 w-4 mr-2" />{result.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {nodes.length > 0 ? (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader><CardTitle>Carte du Réseau</CardTitle><CardDescription>Utilisez la souris pour naviguer. Les points rouges indiquent des activités suspectes.</CardDescription></CardHeader>
              <CardContent>{renderMapContent()}</CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Légende</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getNodeColor('profile', false)}} /><span>Profil</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getNodeColor('card', false)}} /><span>Carte</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getNodeColor('ip', false)}} /><span>Adresse IP</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getNodeColor('device', false)}} /><span>Dispositif</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getNodeColor('', true)}} /><span>Suspect</span></div>
              </CardContent>
            </Card>
            {selectedNode && (
              <Card>
                <CardHeader><CardTitle>Détails du Nœud</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div><span className="text-sm font-semibold">Type:</span><Badge className="ml-2">{selectedNode.type}</Badge></div>
                  <div><span className="text-sm font-semibold">ID:</span><p className="text-xs font-mono mt-1 break-all">{selectedNode.id}</p></div>
                  {selectedNode.metadata?.city && (<div><span className="text-sm font-semibold">Localisation:</span><p className="text-sm mt-1">{selectedNode.metadata.city}, {selectedNode.metadata.country}</p></div>)}
                  <div><span className="text-sm font-semibold">Statut:</span>{selectedNode.suspicious ? <Badge variant="destructive" className="ml-2"><AlertTriangle className="h-3 w-3 mr-1" />Suspect</Badge> : <Badge variant="default" className="ml-2">Normal</Badge>}</div>
                  <div><span className="text-sm font-semibold">Connexions:</span><p className="text-sm mt-1">{edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}</p></div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">Recherchez une entité pour visualiser son réseau de connexions.</p></CardContent></Card>
      )}
    </div>
  );
};

export default FraudNetwork3D;