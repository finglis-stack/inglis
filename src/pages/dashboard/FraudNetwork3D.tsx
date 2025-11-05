import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, AlertTriangle, Info } from 'lucide-react';

// Import OpenGlobus de manière plus simple
import * as og from '@openglobus/og';
import '@openglobus/og/css/og.css';

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

const FraudNetwork3D = () => {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null);
  const entityCollectionRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    if (!globeRef.current || globeInstance.current) return;

    try {
      // Créer une couche de tuiles OpenStreetMap
      const osm = new og.layer.XYZ("OpenStreetMap", {
        isBaseLayer: true,
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visibility: true,
        attribution: 'Data @ OpenStreetMap contributors, ODbL'
      });

      // Initialiser OpenGlobus avec la couche OSM
      const globe = new og.Globe({
        target: globeRef.current,
        name: "Earth",
        terrain: null,
        layers: [osm],
        autoActivate: true,
        atmosphereEnabled: true
      } as any);

      globeInstance.current = globe;

      // Positionner la caméra
      globe.planet.viewExtentArr([0, 0, 0, 0]);

      console.log('Globe initialized successfully');
    } catch (error) {
      console.error('Error initializing globe:', error);
    }

    return () => {
      if (globeInstance.current) {
        try {
          globeInstance.current.destroy();
        } catch (e) {
          console.error('Error destroying globe:', e);
        }
        globeInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!globeInstance.current || nodes.length === 0) return;

    try {
      // Supprimer l'ancienne collection si elle existe
      if (entityCollectionRef.current) {
        globeInstance.current.planet.removeEntityCollection(entityCollectionRef.current);
      }

      // Créer une nouvelle collection d'entités
      const entityCollection = new og.EntityCollection();
      
      entityCollectionRef.current = entityCollection;

      nodes.forEach((node) => {
        const entity = new og.Entity({
          lonlat: [node.lon, node.lat],
          label: {
            text: node.label,
            size: 14,
            color: node.color,
            outline: 1,
            outlineColor: "rgba(255,255,255,0.8)"
          },
          billboard: {
            src: createCircleSVG(node.color, node.suspicious),
            size: [node.suspicious ? 24 : 16, node.suspicious ? 24 : 16],
            color: node.color
          },
          properties: {
            nodeData: node
          }
        });

        (entity as any).events.on("click", () => {
          setSelectedNode(node);
        });

        entityCollection.add(entity);
      });

      // Dessiner les connexions
      edges.forEach((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const lineEntity = new og.Entity({
            polyline: {
              path3v: [
                [sourceNode.lon, sourceNode.lat, 100000] as any,
                [targetNode.lon, targetNode.lat, 100000] as any
              ],
              thickness: edge.suspicious ? 3 : 1,
              color: edge.suspicious ? "rgba(239, 68, 68, 0.6)" : "rgba(148, 163, 184, 0.4)"
            }
          });
          entityCollection.add(lineEntity);
        }
      });

      globeInstance.current.planet.addEntityCollection(entityCollection);

      // Centrer la vue sur les nœuds
      if (nodes.length > 0) {
        const firstNode = nodes[0];
        globeInstance.current.planet.flyLonLat(new og.LonLat(firstNode.lon, firstNode.lat, 5000000));
      }

      console.log('Entities added successfully:', nodes.length, 'nodes,', edges.length, 'edges');
    } catch (error) {
      console.error('Error adding entities:', error);
    }

  }, [nodes, edges]);

  const createCircleSVG = (color: string, suspicious: boolean) => {
    const size = suspicious ? 24 : 16;
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="${suspicious ? '#ff0000' : '#ffffff'}" stroke-width="2"/>
      </svg>
    `)}`;
  };

  const searchNetwork = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    
    try {
      // Recherche par nom de profil
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, legal_name, type')
        .or(`full_name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%`)
        .limit(10);

      // Recherche par numéro de carte (partiel)
      const { data: cards } = await supabase
        .from('cards')
        .select('id, user_initials, issuer_id, random_letters, unique_identifier, check_digit, profile_id, profiles(full_name, legal_name)')
        .or(`user_initials.ilike.%${searchTerm}%,unique_identifier.ilike.%${searchTerm}%`)
        .limit(10);

      const results = [
        ...(profiles || []).map(p => ({ 
          type: 'profile', 
          id: p.id, 
          name: p.full_name || p.legal_name,
          label: `${p.full_name || p.legal_name} (Profil)`
        })),
        ...(cards || []).map(c => {
          const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          return { 
            type: 'card', 
            id: c.id, 
            name: `${c.user_initials} ${c.issuer_id} ${c.random_letters} ****${c.unique_identifier.slice(-3)} ${c.check_digit}`,
            label: `Carte ${c.user_initials}... (${profile?.full_name || profile?.legal_name})`
          };
        })
      ];

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const loadNetworkForEntity = async (entityId: string, entityType: string) => {
    setLoading(true);
    setSearchResults([]);

    try {
      let edgesData: any[] = [];

      // Si c'est un profil, on doit d'abord trouver ses cartes
      if (entityType === 'profile') {
        // Récupérer les cartes du profil
        const { data: profileCards } = await supabase
          .from('cards')
          .select('id')
          .eq('profile_id', entityId);

        if (profileCards && profileCards.length > 0) {
          const cardIds = profileCards.map(c => c.id);
          
          // Récupérer les edges pour toutes les cartes du profil
          const { data: cardEdges } = await supabase
            .from('fraud_network_edges')
            .select('*')
            .or(cardIds.map(id => `source_id.eq.${id},target_id.eq.${id}`).join(','))
            .limit(100);

          edgesData = cardEdges || [];
        }

        // Ajouter aussi les edges directs du profil
        const { data: profileEdges } = await supabase
          .from('fraud_network_edges')
          .select('*')
          .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
          .limit(50);

        if (profileEdges) {
          edgesData = [...edgesData, ...profileEdges];
        }
      } else {
        // Pour les autres types (carte, ip, device), recherche normale
        const { data } = await supabase
          .from('fraud_network_edges')
          .select('*')
          .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
          .limit(50);

        edgesData = data || [];
      }

      if (edgesData.length === 0) {
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      // Récupérer les géolocalisations des IPs
      const ipIds = new Set<string>();
      edgesData.forEach(edge => {
        if (edge.source_type === 'ip') ipIds.add(edge.source_id);
        if (edge.target_type === 'ip') ipIds.add(edge.target_id);
      });

      const ipLocations = new Map<string, GeoLocation>();
      
      for (const ipId of ipIds) {
        const { data: ipData } = await supabase
          .from('ip_addresses')
          .select('ip_address, geolocation, city, country')
          .eq('id', ipId)
          .single();

        if (ipData?.geolocation) {
          ipLocations.set(ipId, {
            lat: ipData.geolocation.lat || ipData.geolocation.latitude,
            lon: ipData.geolocation.lon || ipData.geolocation.longitude,
            city: ipData.city || ipData.geolocation.city,
            country: ipData.country || ipData.geolocation.country
          });
        }
      }

      // Construire les nœuds
      const nodeMap = new Map<string, NetworkNode>();
      const edgesList: NetworkEdge[] = [];

      edgesData.forEach((edge, index) => {
        // Source node
        if (!nodeMap.has(edge.source_id)) {
          let lon = 0, lat = 0;
          
          if (edge.source_type === 'ip' && ipLocations.has(edge.source_id)) {
            const loc = ipLocations.get(edge.source_id)!;
            lat = loc.lat;
            lon = loc.lon;
          } else {
            // Position aléatoire sur le globe
            lon = (Math.random() - 0.5) * 360;
            lat = (Math.random() - 0.5) * 180;
          }

          nodeMap.set(edge.source_id, {
            id: edge.source_id,
            type: edge.source_type as any,
            label: edge.source_id.substring(0, 8),
            lon,
            lat,
            color: getNodeColor(edge.source_type, edge.is_suspicious),
            suspicious: edge.is_suspicious || false,
            metadata: edge.source_type === 'ip' ? ipLocations.get(edge.source_id) : undefined
          });
        }

        // Target node
        if (!nodeMap.has(edge.target_id)) {
          let lon = 0, lat = 0;
          
          if (edge.target_type === 'ip' && ipLocations.has(edge.target_id)) {
            const loc = ipLocations.get(edge.target_id)!;
            lat = loc.lat;
            lon = loc.lon;
          } else {
            lon = (Math.random() - 0.5) * 360;
            lat = (Math.random() - 0.5) * 180;
          }

          nodeMap.set(edge.target_id, {
            id: edge.target_id,
            type: edge.target_type as any,
            label: edge.target_id.substring(0, 8),
            lon,
            lat,
            color: getNodeColor(edge.target_type, edge.is_suspicious),
            suspicious: edge.is_suspicious || false,
            metadata: edge.target_type === 'ip' ? ipLocations.get(edge.target_id) : undefined
          });
        }

        edgesList.push({
          source: edge.source_id,
          target: edge.target_id,
          weight: edge.weight || 1,
          suspicious: edge.is_suspicious || false,
        });
      });

      setNodes(Array.from(nodeMap.values()));
      setEdges(edgesList);
    } catch (error) {
      console.error('Error loading network:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && nodes.length === 0) {
    return (
      <div className="p-8">
        <Skeleton className="h-screen w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Réseau de Fraude 3D
          </h1>
          <p className="text-muted-foreground">Visualisation géographique des connexions suspectes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher un compte ou une carte
          </CardTitle>
          <CardDescription>
            Entrez un nom de personne ou un numéro de carte pour visualiser son réseau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Jean Dupont ou 1234..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchNetwork()}
            />
            <Button onClick={searchNetwork} disabled={searching}>
              {searching ? 'Recherche...' : 'Rechercher'}
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
                  <MapPin className="h-4 w-4 mr-2" />
                  {result.label}
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
                <CardTitle>Carte du Réseau 3D</CardTitle>
                <CardDescription>
                  Utilisez la souris pour naviguer. Les points rouges indiquent des activités suspectes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  ref={globeRef} 
                  className="h-[600px] border rounded-lg overflow-hidden bg-slate-900"
                  style={{ width: '100%' }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Légende
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-sm">Profil</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Carte</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-sm">Adresse IP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                  <span className="text-sm">Dispositif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm">Suspect</span>
                </div>
              </CardContent>
            </Card>

            {selectedNode && (
              <Card>
                <CardHeader>
                  <CardTitle>Détails du Nœud</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold">Type:</span>
                    <Badge className="ml-2">{selectedNode.type}</Badge>
                  </div>
                  <div>
                    <span className="text-sm font-semibold">ID:</span>
                    <p className="text-xs font-mono mt-1 break-all">{selectedNode.id}</p>
                  </div>
                  {selectedNode.metadata?.city && (
                    <div>
                      <span className="text-sm font-semibold">Localisation:</span>
                      <p className="text-sm mt-1">
                        {selectedNode.metadata.city}, {selectedNode.metadata.country}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold">Statut:</span>
                    {selectedNode.suspicious ? (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Suspect
                      </Badge>
                    ) : (
                      <Badge variant="default" className="ml-2">Normal</Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Connexions:</span>
                    <p className="text-sm mt-1">
                      {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Nœuds:</span>
                  <span className="font-semibold">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Connexions:</span>
                  <span className="font-semibold">{edges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Suspects:</span>
                  <span className="font-semibold text-red-600">
                    {nodes.filter(n => n.suspicious).length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Recherchez un compte ou une carte pour visualiser son réseau de connexions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FraudNetwork3D;