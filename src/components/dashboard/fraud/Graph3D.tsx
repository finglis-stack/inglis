"use client";

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

export type GraphNode = {
  id: string;
  type: 'profile' | 'card' | 'ip' | 'device';
  label: string;
  color: string;
  suspicious?: boolean;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight?: number;
  suspicious?: boolean;
};

type Graph3DProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
};

type PositionedNode = GraphNode & { x: number; y: number; z: number };

const typeScale: Record<GraphNode['type'], number> = {
  profile: 0.45,
  card: 0.5,
  ip: 0.4,
  device: 0.35,
};

function buildAdjacency(edges: GraphEdge[]) {
  const adj = new Map<string, Set<string>>();
  edges.forEach((e) => {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  });
  return adj;
}

function bfsDistances(nodes: GraphNode[], edges: GraphEdge[], selectedId?: string | null) {
  const adj = buildAdjacency(edges);
  const dist = new Map<string, number>();
  nodes.forEach(n => dist.set(n.id, Infinity));
  if (!selectedId || !dist.has(selectedId)) {
    // pas de sélection → niveau unique
    nodes.forEach(n => dist.set(n.id, 1));
    return dist;
  }
  const queue: string[] = [selectedId];
  dist.set(selectedId, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    const neigh = adj.get(cur);
    if (!neigh) continue;
    neigh.forEach((m) => {
      if (dist.get(m)! === Infinity) {
        dist.set(m, d + 1);
        queue.push(m);
      }
    });
  }
  return dist;
}

function layoutSpider(nodes: GraphNode[], edges: GraphEdge[], selectedId?: string | null): PositionedNode[] {
  const dist = bfsDistances(nodes, edges, selectedId);
  const rings = new Map<number, GraphNode[]>();
  nodes.forEach(n => {
    const d = dist.get(n.id)!;
    const level = isFinite(d) ? d : 3;
    const clamped = Math.min(level, 4);
    if (!rings.has(clamped)) rings.set(clamped, []);
    rings.get(clamped)!.push(n);
  });

  const radiusByRing: Record<number, number> = { 0: 0, 1: 6, 2: 12, 3: 18, 4: 24 };
  const positioned: PositionedNode[] = [];

  Array.from(rings.entries()).forEach(([ring, arr]) => {
    if (ring === 0 && arr.length) {
      const n = arr[0];
      positioned.push({ ...n, x: 0, y: 0, z: 0 });
      return;
    }
    const r = radiusByRing[ring] || 24;
    const count = arr.length;
    arr.forEach((n, i) => {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (Math.sin(angle * 3) * (ring === 1 ? 1 : 2)); // léger relief 3D
      positioned.push({ ...n, x, y, z });
    });
  });

  return positioned;
}

function Lines({ nodes, edges, selectedId }: { nodes: PositionedNode[], edges: GraphEdge[], selectedId?: string | null }) {
  const indexById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <>
      {edges.map((e, i) => {
        const a = indexById.get(e.source);
        const b = indexById.get(e.target);
        if (!a || !b) return null;
        const isSelected = selectedId && (e.source === selectedId || e.target === selectedId);
        const color = e.suspicious ? '#ef4444' : (isSelected ? '#3b82f6' : '#9ca3af');
        const opacity = isSelected ? 0.9 : (selectedId ? 0.25 : 0.6);
        const width = isSelected ? 2.2 : (e.suspicious ? 1.8 : 1.2);

        return (
          <line key={i}>
            <bufferGeometry attach="geometry">
              {/* two vertices: source and target */}
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial attach="material" color={color} transparent opacity={opacity} linewidth={width as any} />
          </line>
        );
      })}
    </>
  );
}

function NodeMesh({ node, selected, onSelect }: { node: PositionedNode, selected?: boolean, onSelect?: (id: string) => void }) {
  const scale = typeScale[node.type] * (selected ? 1.6 : 1);
  const stroke = selected ? '#ffffff' : (node.suspicious ? '#ef4444' : node.color);
  const fill = node.color;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh onClick={() => onSelect?.(node.id)}>
        <sphereGeometry args={[scale, 24, 24]} />
        <meshStandardMaterial color={fill} emissive={node.suspicious ? '#7f1d1d' : '#000000'} emissiveIntensity={node.suspicious ? 0.25 : 0.05} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[scale + 0.02, 24, 24]} />
        <meshBasicMaterial color={stroke} wireframe opacity={0.8} transparent />
      </mesh>
      <Html distanceFactor={12}>
        <div className="px-2 py-1 rounded bg-black/50 text-white text-xs border border-white/20 max-w-[180px] whitespace-nowrap">
          {node.label}
        </div>
      </Html>
    </group>
  );
}

const Graph3D: React.FC<Graph3DProps> = ({ nodes, edges, selectedId, onSelect }) => {
  const positioned = useMemo(() => layoutSpider(nodes, edges, selectedId), [nodes, edges, selectedId]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden bg-gray-900">
      <Canvas camera={{ position: [0, 20, 32], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <OrbitControls enablePan enableZoom enableRotate />
        {/* anneaux "toile d'araignée" */}
        {[6, 12, 18, 24].map((r, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.02, r + 0.02, 64]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.35} />
          </mesh>
        ))}
        {/* lignes */}
        <Lines nodes={positioned} edges={edges} selectedId={selectedId} />
        {/* nœuds */}
        {positioned.map(n => (
          <NodeMesh key={n.id} node={n} selected={selectedId === n.id} onSelect={onSelect} />
        ))}
      </Canvas>
    </div>
  );
};

export default Graph3D;