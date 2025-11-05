import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, ZoomIn, ZoomOut, RotateCw, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Node {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  suspicious: boolean;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
  suspicious: boolean;
}

const FraudNetwork3D = () => {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const fetchNetworkData = async () => {
      setLoading(true);

      // Fetch fraud network edges
      const { data: edgesData } = await supabase
        .from('fraud_network_edges')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(100);

      if (!edgesData) {
        setLoading(false);
        return;
      }

      // Build nodes from edges
      const nodeMap = new Map<string, Node>();
      const edgesList: Edge[] = [];

      edgesData.forEach((edge) => {
        // Add source node
        if (!nodeMap.has(edge.source_id)) {
          nodeMap.set(edge.source_id, {
            id: edge.source_id,
            type: edge.source_type as any,
            label: edge.source_id.substring(0, 8),
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            z: Math.random() * 400 - 200,
            color: getNodeColor(edge.source_type, edge.is_suspicious),
            size: 10 + edge.weight * 2,
            suspicious: edge.is_suspicious || false,
          });
        }

        // Add target node
        if (!nodeMap.has(edge.target_id)) {
          nodeMap.set(edge.target_id, {
            id: edge.target_id,
            type: edge.target_type as any,
            label: edge.target_id.substring(0, 8),
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
            z: Math.random() * 400 - 200,
            color: getNodeColor(edge.target_type, edge.is_suspicious),
            size: 10 + edge.weight * 2,
            suspicious: edge.is_suspicious || false,
          });
        }

        // Add edge
        edgesList.push({
          source: edge.source_id,
          target: edge.target_id,
          weight: edge.weight || 1,
          suspicious: edge.is_suspicious || false,
        });
      });

      setNodes(Array.from(nodeMap.values()));
      setEdges(edgesList);
      setLoading(false);
    };

    fetchNetworkData();
  }, []);

  const getNodeColor = (type: string, suspicious: boolean) => {
    if (suspicious) return '#ef4444'; // red
    switch (type) {
      case 'profile': return '#3b82f6'; // blue
      case 'card': return '#10b981'; // green
      case 'ip': return '#f59e0b'; // orange
      case 'device': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Center and apply transformations
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);

      // Draw edges
      edges.forEach((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        // Simple 3D projection
        const sourceX = sourceNode.x * Math.cos(rotation.y) - sourceNode.z * Math.sin(rotation.y);
        const sourceY = sourceNode.y * Math.cos(rotation.x) - sourceNode.z * Math.sin(rotation.x);
        const targetX = targetNode.x * Math.cos(rotation.y) - targetNode.z * Math.sin(rotation.y);
        const targetY = targetNode.y * Math.cos(rotation.x) - targetNode.z * Math.sin(rotation.x);

        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = edge.suspicious ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.3)';
        ctx.lineWidth = edge.weight;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        // Simple 3D projection
        const x = node.x * Math.cos(rotation.y) - node.z * Math.sin(rotation.y);
        const y = node.y * Math.cos(rotation.x) - node.z * Math.sin(rotation.x);
        const scale = 1 + (node.z * Math.sin(rotation.x)) / 500;

        ctx.beginPath();
        ctx.arc(x, y, node.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        if (node.suspicious) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.fillText(node.label, x + node.size + 5, y);
      });

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, edges, rotation, zoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvas.width / 2) / zoom;
    const y = (e.clientY - rect.top - canvas.height / 2) / zoom;

    // Find clicked node
    const clickedNode = nodes.find((node) => {
      const nodeX = node.x * Math.cos(rotation.y) - node.z * Math.sin(rotation.y);
      const nodeY = node.y * Math.cos(rotation.x) - node.z * Math.sin(rotation.x);
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      return distance < node.size;
    });

    setSelectedNode(clickedNode || null);
  };

  if (loading) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Réseau de Fraude 3D
          </h1>
          <p className="text-muted-foreground">Visualisation interactive des connexions suspectes</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Graphe de Réseau</CardTitle>
              <CardDescription>
                Cliquez et faites glisser pour explorer. Les nœuds rouges indiquent des activités suspectes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="border rounded-lg cursor-move w-full"
                  onClick={handleCanvasClick}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) {
                      setRotation(prev => ({
                        x: prev.x + e.movementY * 0.01,
                        y: prev.y + e.movementX * 0.01,
                      }));
                    }
                  }}
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.min(z + 0.1, 3))}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setRotation({ x: 0, y: 0 })}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
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
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700" />
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
                  <p className="text-xs font-mono mt-1">{selectedNode.id}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold">Statut:</span>
                  {selectedNode.suspicious ? (
                    <Badge variant="destructive" className="ml-2">Suspect</Badge>
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
                <span className="text-sm">Total de nœuds:</span>
                <span className="font-semibold">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total de connexions:</span>
                <span className="font-semibold">{edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Nœuds suspects:</span>
                <span className="font-semibold text-red-600">
                  {nodes.filter(n => n.suspicious).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Connexions suspectes:</span>
                <span className="font-semibold text-red-600">
                  {edges.filter(e => e.suspicious).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FraudNetwork3D;