import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NetworkNode {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string;
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

const FraudNetwork3D = () => {
  const { t } = useTranslation('dashboard');
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

      // Construire les nœuds
      const nodeMap = new Map<string, NetworkNode>();
      const edgesList: NetworkEdge[] = [];

      edgesData.forEach((edge) => {
        // Source node
        if (!nodeMap.has(edge.source_id)) {
          nodeMap.set(edge.source_id, {
            id: edge.source_id,
            type: edge.source_type as any,
            label: edge.source_id.substring(0, 8),
            color: getNodeColor(edge.source_type, edge.is_suspicious),
            suspicious: edge.is_suspicious || false,
          });
        }

        // Target node
        if (!nodeMap.has(edge.target_id)) {
          nodeMap.set(edge.target_id, {
            id: edge.target_id,
            type: edge.target_type as any,
            label: edge.target_id.substring(0, 8),
            color: getNodeColor(edge.target_type, edge.is_suspicious),
            suspicious: edge.is_suspicious || false,
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Réseau de Fraude
          </h1>
          <p className="text-muted-foreground">Visualisation des connexions suspectes</p>
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

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : nodes.length > 0 ? (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Réseau de Connexions</CardTitle>
                <CardDescription>
                  Cliquez sur un nœud pour voir ses détails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedNode?.id === node.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedNode(node)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: node.color }}
                          />
                          <div>
                            <p className="font-semibold">{node.label}</p>
                            <p className="text-sm text-muted-foreground">{node.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {node.suspicious && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Suspect
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {edges.filter(e => e.source === node.id || e.target === node.id).length} connexions
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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