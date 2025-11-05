import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, AlertTriangle } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Text, Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

interface NetworkNode {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string;
  position: [number, number, number];
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

// Convertir lat/lon en coordonnées 3D sur une sphère (Terre)
const latLonToVector3 = (lat: number, lon: number, radius: number = 100): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return [x, y, z];
};

const Node3D = ({ node, onClick, selected }: { node: NetworkNode; onClick: () => void; selected: boolean }) => {
  return (
    <group position={node.position}>
      <Sphere args={[selected ? 2 : 1.5, 16, 16]} onClick={onClick}>
        <meshStandardMaterial 
          color={node.color} 
          emissive={node.suspicious ? '#ff0000' : '#000000'}
          emissiveIntensity={node.suspicious ? 0.5 : 0}
        />
      </Sphere>
      {selected && (
        <Html distanceFactor={10}>
          <div className="bg-white p-2 rounded shadow-lg text-xs whitespace-nowrap">
            <div className="font-bold">{node.label}</div>
            <div className="text-gray-600">{node.type}</div>
            {node.metadata?.city && <div>{node.metadata.city}, {node.metadata.country}</div>}
          </div>
        </Html>
      )}
    </group>
  );
};

const Connection3D = ({ start, end, suspicious }: { start: [number, number, number]; end: [number, number, number]; suspicious: boolean }) => {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  return (
    <Line
      points={points}
      color={suspicious ? '#ef4444' : '#94a3b8'}
      lineWidth={suspicious ? 2 : 1}
      opacity={0.6}
      transparent
    />
  );
};

const Earth3D = () => {
  return (
    <Sphere args={[98, 64, 64]}>
      <meshStandardMaterial 
        color="#1e40af" 
        opacity={0.3} 
        transparent 
        wireframe
      />
    </Sphere>
  );
};

const FraudNetwork3D = () => {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(true);
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
      // Récupérer les edges liés à cette entité
      const { data: edgesData } = await supabase
        .from('fraud_network_edges')
        .select('*')
        .or(`source_id.eq.${entityId},target_id.eq.${entityId}`)
        .limit(50);

      if (!edgesData || edgesData.length === 0) {
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
          .select('ip_address, geolocation')
          .eq('id', ipId)
          .single();

        if (ipData?.geolocation) {
          ipLocations.set(ipId, {
            lat: ipData.geolocation.lat,
            lon: ipData.geolocation.lon,
            city: ipData.geolocation.city,
            country: ipData.geolocation.country
          });
        }
      }

      // Construire les nœuds
      const nodeMap = new Map<string, NetworkNode>();
      const edgesList: NetworkEdge[] = [];

      // Position centrale pour l'entité recherchée
      const centerPos: [number, number, number] = [0, 0, 0];

      edgesData.forEach((edge, index) => {
        // Source node
        if (!nodeMap.has(edge.source_id)) {
          let position: [number, number, number];
          
          if (edge.source_type === 'ip' && ipLocations.has(edge.source_id)) {
            const loc = ipLocations.get(edge.source_id)!;
            position = latLonToVector3(loc.lat, loc.lon);
          } else {
            // Position aléatoire autour du centre
            const angle = (index / edgesData.length) * Math.PI * 2;
            const radius = 50;
            position = [
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              (Math.random() - 0.5) * 30
            ];
          }

          nodeMap.set(edge.source_id, {
            id: edge.source_id,
            type: edge.source_type as any,
            label: edge.source_id.substring(0, 8),
            position,
            color: getNodeColor(edge.source_type, edge.is_suspicious),
            suspicious: edge.is_suspicious || false,
            metadata: edge.source_type === 'ip' ? ipLocations.get(edge.source_id) : undefined
          });
        }

        // Target node
        if (!nodeMap.has(edge.target_id)) {
          let position: [number, number, number];
          
          if (edge.target_type === 'ip' && ipLocations.has(edge.target_id)) {
            const loc = ipLocations.get(edge.target_id)!;
            position = latLonToVector3(loc.lat, loc.lon);
          } else {
            const angle = ((index + 0.5) / edgesData.length) * Math.PI * 2;
            const radius = 50;
            position = [
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              (Math.random() - 0.5) * 30
            ];
          }

          nodeMap.set(edge.target_id, {
            id: edge.target_id,
            type: edge.target_type as any,
            label: edge.target_id.substring(0, 8),
            position,
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
                <div className="h-[600px] border rounded-lg overflow-hidden bg-slate-950">
                  <Canvas camera={{ position: [0, 0, 200], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[100, 100, 100]} intensity={1} />
                    <pointLight position={[-100, -100, -100]} intensity={0.5} />
                    
                    <Earth3D />
                    
                    {edges.map((edge, i) => {
                      const sourceNode = nodes.find(n => n.id === edge.source);
                      const targetNode = nodes.find(n => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;
                      
                      return (
                        <Connection3D
                          key={i}
                          start={sourceNode.position}
                          end={targetNode.position}
                          suspicious={edge.suspicious}
                        />
                      );
                    })}
                    
                    {nodes.map((node) => (
                      <Node3D
                        key={node.id}
                        node={node}
                        onClick={() => setSelectedNode(node)}
                        selected={selectedNode?.id === node.id}
                      />
                    ))}
                    
                    <OrbitControls enablePan enableZoom enableRotate />
                  </Canvas>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Légende</CardTitle>
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