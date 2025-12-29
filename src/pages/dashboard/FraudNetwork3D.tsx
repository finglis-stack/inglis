import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, AlertTriangle, Info, User, CreditCard, Smartphone, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { showError } from '@/utils/toast';

// --- Types ---

interface NetworkNode {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string; // Sera masqué
  realName?: string; // Nom réel (optionnel, pour debug ou admin)
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

// --- Helpers ---

const fetchMapsApiKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
  if (!data || !data.apiKey) throw new Error('La clé API Google Maps n\'est pas configurée.');
  return data.apiKey;
};

// Fonction pour masquer les données sensibles
const maskData = (text: string, type: 'name' | 'card' | 'other'): string => {
  if (!text) return 'Inconnu';
  
  if (type === 'name') {
    // Jean Dupont -> J*** D*****
    return text.split(' ').map(part => part[0] + '*'.repeat(Math.max(0, part.length - 1))).join(' ');
  }
  
  if (type === 'card') {
    // 4500...1234 -> Carte **** 1234
    if (text.length > 4) return `Carte **** ${text.slice(-4)}`;
    return 'Carte ****';
  }

  return text;
};

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem',
};

const monochromeMapStyle = [
  {
    "featureType": "all",
    "elementType": "all",
    "stylers": [
      { "saturation": -100 }
    ]
  }
];

// --- Composant Carte ---

const NetworkMap = ({ apiKey, nodes, edges, center, onNodeClick, selectedNode, onInfoWindowClose }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'fraud-network-map-script',
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  if (loadError) return <div className="text-red-500 p-4 border border-red-200 rounded">Erreur de chargement de la carte Google Maps. Vérifiez votre clé API.</div>;
  if (!isLoaded) return <Skeleton className="h-[600px] w-full" />;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={8}
      mapTypeId="satellite"
      options={{ 
        mapTypeControl: false, 
        streetViewControl: false, 
        fullscreenControl: true, 
        tilt: 45,
        styles: monochromeMapStyle 
      }}
    >
      {/* Lignes de connexion (Edges) */}
      {edges.map((edge, i) => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (!source || !target) return null;

        // Logique de mise en évidence :
        // Si un nœud est sélectionné, on regarde si cette ligne y est connectée.
        const isConnectedToSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
        
        // Si rien n'est sélectionné, on affiche tout normalement.
        // Si quelque chose est sélectionné, on grise ce qui n'est pas connecté.
        const isDimmed = selectedNode && !isConnectedToSelected;

        let strokeColor = edge.suspicious ? "#ef4444" : "#9ca3af"; // Rouge si suspect, Gris sinon
        let strokeWeight = edge.suspicious ? 2 : 1;
        let zIndex = 1;

        if (isConnectedToSelected) {
          strokeColor = "#3b82f6"; // Bleu vif pour les connexions actives
          strokeWeight = 4; // Plus épais
          zIndex = 100; // Au dessus
        } else if (isDimmed) {
          strokeColor = "rgba(156, 163, 175, 0.2)"; // Gris très transparent
        }

        return (
          <Polyline
            key={`${edge.source}-${edge.target}-${i}`}
            path={[{ lat: source.lat, lng: source.lon }, { lat: target.lat, lng: target.lon }]}
            options={{
              strokeColor: strokeColor,
              strokeOpacity: isDimmed ? 0.2 : 0.8,
              strokeWeight: strokeWeight,
              geodesic: true,
              zIndex: zIndex,
            }}
          />
        );
      })}

      {/* Points (Nodes) */}
      {nodes.map(node => {
        const isSelected = selectedNode && selectedNode.id === node.id;
        // Est-ce que ce nœud est connecté au nœud sélectionné ?
        const isConnected = selectedNode && edges.some(e => 
          (e.source === selectedNode.id && e.target === node.id) || 
          (e.source === node.id && e.target === selectedNode.id)
        );
        
        const isDimmed = selectedNode && !isSelected && !isConnected;

        return (
          <Marker
            key={node.id}
            position={{ lat: node.lat, lng: node.lon }}
            title={node.label} // Le label est déjà masqué
            onClick={() => onNodeClick(node)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: node.color,
              fillOpacity: isDimmed ? 0.3 : 0.9,
              strokeColor: node.suspicious ? '#ef4444' : (isSelected ? '#ffffff' : node.color),
              strokeWeight: isSelected ? 3 : 1,
              scale: isSelected ? 10 : (node.type === 'ip' ? 6 : 8),
            }}
          />
        );
      })}

      {selectedNode && (
        <InfoWindow
          position={{ lat: selectedNode.lat, lng: selectedNode.lon }}
          onCloseClick={onInfoWindowClose}
        >
          <div className="p-2 min-w-[200px]">
            <div className="flex items-center gap-2 mb-2">
              {selectedNode.type === 'profile' && <User className="h-4 w-4 text-blue-500" />}
              {selectedNode.type === 'card' && <CreditCard className="h-4 w-4 text-green-500" />}
              {selectedNode.type === 'ip' && <Globe className="h-4 w-4 text-orange-500" />}
              {selectedNode.type === 'device' && <Smartphone className="h-4 w-4 text-purple-500" />}
              <h4 className="font-bold text-sm">{selectedNode.label}</h4>
            </div>
            
            <div className="text-xs space-y-1 text-gray-600">
              <p>Type: <span className="font-semibold capitalize">{selectedNode.type}</span></p>
              {selectedNode.metadata?.city && (
                <p>Lieu: {selectedNode.metadata.city}, {selectedNode.metadata.country}</p>
              )}
              {selectedNode.suspicious && (
                <p className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Activité Suspecte
                </p>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

// --- Composant Principal ---

const FraudNetwork3D = () => {
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 46.8139, lng: -71.2080 }); // Québec par défaut

  const { data: apiKey, isLoading: isLoadingApiKey, isError: isApiKeyError, error: apiKeyError } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const getNodeColor = (type: string, suspicious: boolean) => {
    if (suspicious) return '#ef4444'; // Rouge si suspect
    switch (type) {
      case 'profile': return '#3b82f6'; // Bleu
      case 'card': return '#10b981'; // Vert
      case 'ip': return '#f59e0b'; // Orange
      case 'device': return '#8b5cf6'; // Violet
      default: return '#6b7280';
    }
  };

  const searchNetwork = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      // Recherche Profils
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, legal_name, type')
        .or(`full_name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%`)
        .limit(5);

      // Recherche Cartes
      const { data: cards } = await supabase
        .from('cards')
        .select('id, user_initials, unique_identifier, profiles(full_name, legal_name)')
        .or(`user_initials.ilike.%${searchTerm}%,unique_identifier.ilike.%${searchTerm}%`)
        .limit(5);

      const results = [
        ...(profiles || []).map(p => ({ 
          type: 'profile', 
          id: p.id, 
          // Masquage ici pour la liste de recherche
          label: `${maskData(p.full_name || p.legal_name, 'name')} (Profil)` 
        })),
        ...(cards || []).map(c => {
          const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          const profileName = profile?.full_name || profile?.legal_name;
          return { 
            type: 'card', 
            id: c.id, 
            // Masquage ici
            label: `${maskData(c.unique_identifier, 'card')} (${maskData(profileName, 'name')})` 
          };
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
      
      // Si c'est un profil, on cherche d'abord ses cartes pour étendre le réseau
      if (entityType === 'profile') {
        const { data: profileCards } = await supabase.from('cards').select('id').eq('profile_id', entityId);
        
        // On cherche les liens directs avec le profil (Device -> Profil, IP -> Profil)
        // ET les liens avec ses cartes
        let orConditions = [`source_id.eq.${entityId}`, `target_id.eq.${entityId}`];
        
        if (profileCards && profileCards.length > 0) {
          const cardIds = profileCards.map(c => c.id);
          cardIds.forEach(id => {
            orConditions.push(`source_id.eq.${id}`);
            orConditions.push(`target_id.eq.${id}`);
          });
        }
        
        const { data: edges } = await supabase
          .from('fraud_network_edges')
          .select('*')
          .or(orConditions.join(','))
          .limit(200); // Limite augmentée pour voir plus de connexions
          
        edgesData = edges || [];
      } else {
        // Recherche standard pour les autres entités
        const { data } = await supabase
          .from('fraud_network_edges')
          .select('*')
          .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
          .limit(100);
        edgesData = data || [];
      }

      if (edgesData.length === 0) {
        setNodes([]); setEdges([]); setLoading(false); return;
      }

      // Récupération des IPs pour la géolocalisation
      const ipAddresses = new Set<string>();
      edgesData.forEach(edge => {
        if (edge.source_type === 'ip') ipAddresses.add(edge.source_id);
        if (edge.target_type === 'ip') ipAddresses.add(edge.target_id);
      });

      const ipLocations = new Map<string, GeoLocation>();
      if (ipAddresses.size > 0) {
        const { data: ipData } = await supabase
          .from('ip_addresses')
          .select('ip_address, geolocation, city, country')
          .in('ip_address', Array.from(ipAddresses));
          
        if (ipData) {
          ipData.forEach(ip => {
            if (ip.geolocation?.lat && ip.geolocation?.lon) {
              ipLocations.set(ip.ip_address, { 
                lat: ip.geolocation.lat, 
                lon: ip.geolocation.lon, 
                city: ip.city, 
                country: ip.country 
              });
            }
          });
        }
      }

      // Calcul du centre de la carte
      const geoNodes: { lat: number; lon: number }[] = Array.from(ipLocations.values());
      let centerLat = 45.5017, centerLon = -73.5673;
      if (geoNodes.length > 0) {
        centerLat = geoNodes.reduce((sum, node) => sum + node.lat, 0) / geoNodes.length;
        centerLon = geoNodes.reduce((sum, node) => sum + node.lon, 0) / geoNodes.length;
      }
      setMapCenter({ lat: centerLat, lng: centerLon });

      // Construction des nœuds
      const nodeMap = new Map<string, NetworkNode>();
      const nonGeoNodeInfos: any[] = [];
      const allNodeInfos = new Map<string, any>();

      // Collecte unique des nœuds
      edgesData.forEach(edge => {
        if (!allNodeInfos.has(edge.source_id)) allNodeInfos.set(edge.source_id, { id: edge.source_id, type: edge.source_type, suspicious: edge.is_suspicious });
        if (!allNodeInfos.has(edge.target_id)) allNodeInfos.set(edge.target_id, { id: edge.target_id, type: edge.target_type, suspicious: edge.is_suspicious });
      });

      // Récupération des noms réels pour les profils (pour le masquage)
      const profileIds = Array.from(allNodeInfos.values()).filter(n => n.type === 'profile').map(n => n.id);
      const profileNames = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, legal_name').in('id', profileIds);
        profiles?.forEach(p => profileNames.set(p.id, p.full_name || p.legal_name));
      }

      // Création des objets Node
      allNodeInfos.forEach(nodeInfo => {
        let label = nodeInfo.id;
        
        // Masquage intelligent selon le type
        if (nodeInfo.type === 'profile') {
          const realName = profileNames.get(nodeInfo.id) || 'Inconnu';
          label = maskData(realName, 'name');
        } else if (nodeInfo.type === 'card') {
          // On suppose que l'ID de la carte n'est pas le PAN, mais on masque quand même pour l'uniformité
          label = "Carte ****"; 
        } else if (nodeInfo.type === 'device') {
          label = `Device ${nodeInfo.id.substring(0, 6)}...`;
        } else if (nodeInfo.type === 'ip') {
          label = nodeInfo.id; // IP reste visible
        }

        if (nodeInfo.type === 'ip' && ipLocations.has(nodeInfo.id)) {
          const loc = ipLocations.get(nodeInfo.id)!;
          nodeMap.set(nodeInfo.id, { 
            id: nodeInfo.id, 
            type: nodeInfo.type, 
            label: label, 
            lat: loc.lat, 
            lon: loc.lon, 
            color: getNodeColor(nodeInfo.type, nodeInfo.suspicious), 
            suspicious: nodeInfo.suspicious || false, 
            metadata: loc 
          });
        } else {
          nonGeoNodeInfos.push({ ...nodeInfo, label });
        }
      });

      // Placement circulaire pour les nœuds sans géolocalisation (autour du centre)
      const radius = 0.05; // ~5km
      const angleStep = nonGeoNodeInfos.length > 0 ? (2 * Math.PI) / nonGeoNodeInfos.length : 0;
      
      nonGeoNodeInfos.forEach((nodeInfo, i) => {
        const angle = i * angleStep;
        const lat = centerLat + radius * Math.cos(angle);
        const lon = centerLon + radius * Math.sin(angle);
        
        nodeMap.set(nodeInfo.id, { 
          id: nodeInfo.id, 
          type: nodeInfo.type, 
          label: nodeInfo.label, 
          lat, 
          lon, 
          color: getNodeColor(nodeInfo.type, nodeInfo.suspicious), 
          suspicious: nodeInfo.suspicious || false 
        });
      });

      setNodes(Array.from(nodeMap.values()));
      setEdges(edgesData.map(edge => ({ 
        source: edge.source_id, 
        target: edge.target_id, 
        weight: edge.weight || 1, 
        suspicious: edge.is_suspicious || false 
      })));

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
          <p className="text-muted-foreground">Visualisation des connexions. Les données sensibles sont masquées.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Rechercher une entité</CardTitle>
          <CardDescription>Entrez un nom ou un identifiant pour visualiser son réseau.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="Ex: Jean Dupont..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && searchNetwork()} 
            />
            <Button onClick={searchNetwork} disabled={searching}>
              {searching ? '...' : 'Rechercher'}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Résultats:</p>
              {searchResults.map((result) => (
                <Button 
                  key={result.id} 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => loadNetworkForEntity(result.id, result.type)}
                >
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
              <CardHeader>
                <CardTitle>Carte du Réseau</CardTitle>
                <CardDescription>
                  Cliquez sur un point (ex: Profil Bleu) pour mettre en évidence toutes ses connexions.
                </CardDescription>
              </CardHeader>
              <CardContent>{renderMapContent()}</CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Légende</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500" /><span>Profil</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /><span>Carte</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500" /><span>Adresse IP</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-purple-500" /><span>Dispositif</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500" /><span>Suspect</span></div>
                <div className="h-px bg-gray-200 my-2" />
                <div className="flex items-center gap-2"><div className="w-8 h-1 bg-blue-500" /><span>Connexion Active</span></div>
              </CardContent>
            </Card>
            
            {selectedNode && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Nœud Sélectionné</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><span className="text-sm font-semibold">Label:</span><p className="text-lg font-bold">{selectedNode.label}</p></div>
                  <div><span className="text-sm font-semibold">Type:</span><Badge className="ml-2 capitalize">{selectedNode.type}</Badge></div>
                  {selectedNode.metadata?.city && (
                    <div><span className="text-sm font-semibold">Localisation:</span><p className="text-sm">{selectedNode.metadata.city}, {selectedNode.metadata.country}</p></div>
                  )}
                  <div>
                    <span className="text-sm font-semibold">Connexions directes:</span>
                    <p className="text-2xl font-bold text-blue-600">
                      {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Recherchez une entité pour visualiser son réseau de connexions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FraudNetwork3D;