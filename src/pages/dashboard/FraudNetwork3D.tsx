"use client";

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Network, Search, MapPin, Info, CreditCard, Globe, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import Graph3D, { GraphNode, GraphEdge } from '@/components/dashboard/fraud/Graph3D';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { isIpSuspicious } from '@/utils/ipGeolocation';

type SearchResult = { type: 'card' | 'profile'; id: string; label: string };

type GeoPoint = { lat: number; lon: number; city?: string; country?: string };

const fetchMapsApiKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
  if (!data || !data.apiKey) throw new Error('La clé API Google Maps n\'est pas configurée.');
  return data.apiKey;
};

const getNodeColor = (type: GraphNode['type'], suspicious?: boolean) => {
  if (suspicious) return '#ef4444';
  switch (type) {
    case 'profile': return '#3b82f6';
    case 'card': return '#10b981';
    case 'ip': return '#f59e0b';
    case 'device': return '#8b5cf6';
    default: return '#6b7280';
  }
};

const FraudNetwork3D = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [ipMarkers, setIpMarkers] = useState<GeoPoint[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const { data: apiKey, isLoading: isLoadingApiKey } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const onSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, legal_name')
        .or(`full_name.ilike.%${searchTerm}%,legal_name.ilike.%${searchTerm}%`)
        .limit(5);

      const { data: cards } = await supabase
        .from('cards')
        .select('id, card_programs(program_name)')
        .or(`random_letters.ilike.%${searchTerm}%,unique_identifier.ilike.%${searchTerm}%`)
        .limit(5);

      const res: SearchResult[] = [
        ...(profiles || []).map((p: any) => ({ type: 'profile' as const, id: p.id, label: `${p.full_name || p.legal_name} (Profil)` })),
        ...(cards || []).map((c: any) => {
          const prog = Array.isArray(c.card_programs) ? c.card_programs[0] : c.card_programs;
          return { type: 'card' as const, id: c.id, label: `${prog?.program_name || 'Carte'} (${c.id.slice(0, 6)})` };
        }),
      ];
      setResults(res);
    } finally {
      setSearching(false);
    }
  };

  const computeMapCenter = (points: GeoPoint[]) => {
    if (!points.length) return null;
    const lat = points.reduce((s, p) => s + (p.lat || 0), 0) / points.length;
    const lon = points.reduce((s, p) => s + (p.lon || 0), 0) / points.length;
    return { lat, lng: lon };
  };

  const loadForCard = useCallback(async (cardId: string) => {
    // details de carte + image programme
    const { data: card } = await supabase
      .from('cards')
      .select('id, profile_id, status, card_programs(program_name, card_type, card_image_url), profiles(id, full_name, legal_name)')
      .eq('id', cardId)
      .maybeSingle();

    setSelectedCard(card || null);

    // comptes liés
    const { data: debitAcc } = await supabase.from('debit_accounts').select('id').eq('card_id', cardId);
    const { data: creditAcc } = await supabase.from('credit_accounts').select('id').eq('card_id', cardId);
    const debitIds = (debitAcc || []).map((d: any) => d.id);
    const creditIds = (creditAcc || []).map((c: any) => c.id);

    // transactions de la carte
    const { data: txForCard } = await supabase
      .from('transactions')
      .select('id, ip_address, debit_account_id, credit_account_id, created_at')
      .or([
        debitIds.length ? `debit_account_id.in.(${debitIds.join(',')})` : 'debit_account_id.is.null',
        creditIds.length ? `credit_account_id.in.(${creditIds.join(',')})` : 'credit_account_id.is.null',
      ].join(','))
      .limit(1000);

    const ipList = Array.from(new Set((txForCard || []).map((t: any) => t.ip_address).filter(Boolean)));

    // IPs géolocalisées
    let allMarkers: GeoPoint[] = [];
    const { data: ipRows } = ipList.length
      ? await supabase.from('ip_addresses').select('ip_address, geolocation, city, country, is_vpn, is_proxy, is_tor').in('ip_address', ipList)
      : { data: [] as any[] };

    const nodesBuf: GraphNode[] = [];
    const edgesBuf: GraphEdge[] = [];

    // nœud carte + profil
    const program = Array.isArray(card?.card_programs) ? card?.card_programs[0] : card?.card_programs;
    const holder = Array.isArray(card?.profiles) ? card?.profiles[0] : card?.profiles;
    const cardLabel = `${program?.program_name || 'Carte'} (${program?.card_type === 'credit' ? 'Crédit' : 'Débit'})`;

    nodesBuf.push({
      id: cardId,
      type: 'card',
      label: cardLabel,
      color: getNodeColor('card', false),
      suspicious: false,
    });

    if (holder) {
      nodesBuf.push({
        id: holder.id,
        type: 'profile',
        label: holder.full_name || holder.legal_name || 'Profil',
        color: getNodeColor('profile', false),
        suspicious: false,
      });
      edgesBuf.push({ source: holder.id, target: cardId, weight: 1 });
    }

    // IP → carte + IP ↔ autres cartes (IP partagée)
    for (const ipRow of (ipRows || [])) {
      const geo = ipRow.geolocation;
      const point: GeoPoint | null = (geo?.lat && geo?.lon) ? { lat: geo.lat, lon: geo.lon, city: ipRow.city, country: ipRow.country } : null;
      if (point) allMarkers.push(point);

      // suspicion via flags ou API
      const ipSuspicious = Boolean(ipRow.is_proxy || ipRow.is_vpn || ipRow.is_tor) || (await isIpSuspicious(ipRow.ip_address));

      nodesBuf.push({
        id: ipRow.ip_address,
        type: 'ip',
        label: `${ipRow.ip_address}${ipSuspicious ? ' (suspect)' : ''}`,
        color: getNodeColor('ip', ipSuspicious),
        suspicious: ipSuspicious,
      });
      edgesBuf.push({ source: ipRow.ip_address, target: cardId, weight: 1, suspicious: ipSuspicious });

      // autres transactions sur la même IP → récupérer comptes et cartes
      const { data: txSameIp } = await supabase
        .from('transactions')
        .select('debit_account_id, credit_account_id')
        .eq('ip_address', ipRow.ip_address)
        .limit(1000);

      const otherDebitIds = Array.from(new Set((txSameIp || []).map((t: any) => t.debit_account_id).filter((id: any) => id && !debitIds.includes(id))));
      const otherCreditIds = Array.from(new Set((txSameIp || []).map((t: any) => t.credit_account_id).filter((id: any) => id && !creditIds.includes(id))));

      if (otherDebitIds.length) {
        const { data: otherDebits } = await supabase.from('debit_accounts').select('id, card_id, profile_id').in('id', otherDebitIds);
        const otherCardIds = Array.from(new Set((otherDebits || []).map((d: any) => d.card_id).filter(Boolean)));
        if (otherCardIds.length) {
          const { data: otherCards } = await supabase.from('cards').select('id, profiles(id, full_name, legal_name), card_programs(program_name, card_type)').in('id', otherCardIds);
          for (const oc of (otherCards || [])) {
            const prog = Array.isArray(oc.card_programs) ? oc.card_programs[0] : oc.card_programs;
            const prof = Array.isArray(oc.profiles) ? oc.profiles[0] : oc.profiles;
            const label = `${prog?.program_name || 'Carte'} (${prog?.card_type === 'credit' ? 'Crédit' : 'Débit'})`;
            nodesBuf.push({ id: oc.id, type: 'card', label, color: getNodeColor('card', false) });
            edgesBuf.push({ source: ipRow.ip_address, target: oc.id, weight: 1, suspicious: ipSuspicious });
            // relier cartes entre elles par la même IP
            edgesBuf.push({ source: cardId, target: oc.id, weight: 1, suspicious: ipSuspicious });
            if (prof) {
              nodesBuf.push({ id: prof.id, type: 'profile', label: prof.full_name || prof.legal_name || 'Profil', color: getNodeColor('profile', false) });
              edgesBuf.push({ source: prof.id, target: oc.id, weight: 1 });
            }
          }
        }
      }
      if (otherCreditIds.length) {
        const { data: otherCredits } = await supabase.from('credit_accounts').select('id, card_id, profile_id').in('id', otherCreditIds);
        const otherCardIds = Array.from(new Set((otherCredits || []).map((c: any) => c.card_id).filter(Boolean)));
        if (otherCardIds.length) {
          const { data: otherCards } = await supabase.from('cards').select('id, profiles(id, full_name, legal_name), card_programs(program_name, card_type)').in('id', otherCardIds);
          for (const oc of (otherCards || [])) {
            const prog = Array.isArray(oc.card_programs) ? oc.card_programs[0] : oc.card_programs;
            const prof = Array.isArray(oc.profiles) ? oc.profiles[0] : oc.profiles;
            const label = `${prog?.program_name || 'Carte'} (${prog?.card_type === 'credit' ? 'Crédit' : 'Débit'})`;
            nodesBuf.push({ id: oc.id, type: 'card', label, color: getNodeColor('card', false) });
            edgesBuf.push({ source: ipRow.ip_address, target: oc.id, weight: 1, suspicious: ipSuspicious });
            edgesBuf.push({ source: cardId, target: oc.id, weight: 1, suspicious: ipSuspicious });
            if (prof) {
              nodesBuf.push({ id: prof.id, type: 'profile', label: prof.full_name || prof.legal_name || 'Profil', color: getNodeColor('profile', false) });
              edgesBuf.push({ source: prof.id, target: oc.id, weight: 1 });
            }
          }
        }
      }
    }

    // de-dup nœuds
    const nodemap = new Map<string, GraphNode>();
    nodesBuf.forEach(n => {
      if (!nodemap.has(n.id)) nodemap.set(n.id, n);
    });
    const mergedNodes = Array.from(nodemap.values());

    setNodes(mergedNodes);
    setEdges(edgesBuf);
    setSelectedNodeId(cardId);

    setIpMarkers(allMarkers);
    const center = computeMapCenter(allMarkers);
    setMapCenter(center);
  }, []);

  const loadForProfile = useCallback(async (profileId: string) => {
    // profil + cartes reliées
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, legal_name')
      .eq('id', profileId)
      .maybeSingle();

    const { data: cards } = await supabase
      .from('cards')
      .select('id, card_programs(program_name, card_type)')
      .eq('profile_id', profileId);

    const nodesBuf: GraphNode[] = [];
    const edgesBuf: GraphEdge[] = [];
    nodesBuf.push({
      id: profileId,
      type: 'profile',
      label: profile?.full_name || profile?.legal_name || 'Profil',
      color: getNodeColor('profile'),
    });

    for (const c of (cards || [])) {
      const prog = Array.isArray(c.card_programs) ? c.card_programs[0] : c.card_programs;
      const label = `${prog?.program_name || 'Carte'} (${prog?.card_type === 'credit' ? 'Crédit' : 'Débit'})`;
      nodesBuf.push({ id: c.id, type: 'card', label, color: getNodeColor('card') });
      edgesBuf.push({ source: profileId, target: c.id, weight: 1 });
    }

    // IPs du profil via table ip_addresses
    const { data: ipRows } = await supabase
      .from('ip_addresses')
      .select('ip_address, geolocation, city, country, is_vpn, is_proxy, is_tor')
      .eq('profile_id', profileId);

    let allMarkers: GeoPoint[] = [];

    for (const ipRow of (ipRows || [])) {
      const ipSuspicious = Boolean(ipRow.is_proxy || ipRow.is_vpn || ipRow.is_tor) || (await isIpSuspicious(ipRow.ip_address));
      nodesBuf.push({
        id: ipRow.ip_address,
        type: 'ip',
        label: `${ipRow.ip_address}${ipSuspicious ? ' (suspect)' : ''}`,
        color: getNodeColor('ip', ipSuspicious),
        suspicious: ipSuspicious,
      });
      edgesBuf.push({ source: ipRow.ip_address, target: profileId, weight: 1, suspicious: ipSuspicious });
      if (ipRow.geolocation?.lat && ipRow.geolocation?.lon) {
        allMarkers.push({ lat: ipRow.geolocation.lat, lon: ipRow.geolocation.lon, city: ipRow.city, country: ipRow.country });
      }

      // lier cartes entre elles via même IP: transactions à cette IP → comptes → cartes
      const { data: txSameIp } = await supabase
        .from('transactions')
        .select('debit_account_id, credit_account_id')
        .eq('ip_address', ipRow.ip_address)
        .limit(1000);

      const debitIds = Array.from(new Set((txSameIp || []).map((t: any) => t.debit_account_id).filter(Boolean)));
      const creditIds = Array.from(new Set((txSameIp || []).map((t: any) => t.credit_account_id).filter(Boolean)));

      const { data: dAccs } = debitIds.length ? await supabase.from('debit_accounts').select('id, card_id').in('id', debitIds) : { data: [] as any[] };
      const { data: cAccs } = creditIds.length ? await supabase.from('credit_accounts').select('id, card_id').in('id', creditIds) : { data: [] as any[] };
      const cardIds = Array.from(new Set([...(dAccs || []).map((a: any) => a.card_id), ...(cAccs || []).map((a: any) => a.card_id)].filter(Boolean)));

      if (cardIds.length) {
        const { data: ipCards } = await supabase.from('cards').select('id, card_programs(program_name, card_type)').in('id', cardIds);
        for (const oc of (ipCards || [])) {
          if (!nodesBuf.find(n => n.id === oc.id)) {
            const prog = Array.isArray(oc.card_programs) ? oc.card_programs[0] : oc.card_programs;
            const label = `${prog?.program_name || 'Carte'} (${prog?.card_type === 'credit' ? 'Crédit' : 'Débit'})`;
            nodesBuf.push({ id: oc.id, type: 'card', label, color: getNodeColor('card') });
          }
          // relier IP → carte et carte ↔ autres cartes via IP
          edgesBuf.push({ source: ipRow.ip_address, target: oc.id, weight: 1, suspicious: ipSuspicious });
          cards?.forEach((baseCard: any) => {
            if (baseCard.id !== oc.id) edgesBuf.push({ source: baseCard.id, target: oc.id, weight: 1, suspicious: ipSuspicious });
          });
        }
      }
    }

    setNodes(nodesBuf);
    setEdges(edgesBuf);
    setSelectedNodeId(profileId);
    setIpMarkers(allMarkers);
    const center = computeMapCenter(allMarkers);
    setMapCenter(center);
    setSelectedCard(null);
  }, []);

  const onSelectResult = async (r: SearchResult) => {
    setResults([]);
    setNodes([]); setEdges([]); setIpMarkers([]);
    if (r.type === 'card') await loadForCard(r.id);
    else await loadForProfile(r.id);
  };

  const mapPanel = useMemo(() => {
    if (isLoadingApiKey) return <Skeleton className="h-[600px] w-full" />;
    if (!apiKey) return <div className="text-muted-foreground">Clé Google Maps indisponible.</div>;
    const center = mapCenter || { lat: 46.8139, lng: -71.2080 };
    return (
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '600px', borderRadius: '0.5rem' }}
        center={center}
        zoom={6}
        options={{ mapTypeId: 'satellite', tilt: 45, streetViewControl: false, mapTypeControl: true, fullscreenControl: true }}
      >
        {ipMarkers.map((p, i) => (
          <Marker key={`${p.lat}-${p.lon}-${i}`} position={{ lat: p.lat, lng: p.lon }} />
        ))}
      </GoogleMap>
    );
  }, [apiKey, isLoadingApiKey, ipMarkers, mapCenter]);

  const programImageUrl = useMemo(() => {
    const prog = Array.isArray(selectedCard?.card_programs) ? selectedCard.card_programs[0] : selectedCard?.card_programs;
    return prog?.card_image_url || undefined;
  }, [selectedCard]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Network className="h-8 w-8" />Réseau de Fraude</h1>
          <p className="text-muted-foreground">Visualisation 3D et géolocalisation. Les liens sont calculés à partir des données (IP, comptes, cartes, profils).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Rechercher</CardTitle>
          <CardDescription>Recherchez une carte ou un profil, puis le graphe et la carte se construiront automatiquement.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Programme, identifiant, nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <Button onClick={onSearch} disabled={searching}>
              {searching ? '...' : 'Rechercher'}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Résultats:</p>
              {results.map((r) => (
                <Button key={r.id} variant="outline" className="w-full justify-start" onClick={() => onSelectResult(r)}>
                  <MapPin className="h-4 w-4 mr-2" />{r.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panneau résumé sélection */}
      {(selectedCard || selectedNodeId) && (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Graphe 3D</CardTitle>
                <CardDescription>Cliquez sur un nœud pour mettre en évidence ses connexions (toile d’araignée).</CardDescription>
              </CardHeader>
              <CardContent>
                {nodes.length ? (
                  <Graph3D
                    nodes={nodes}
                    edges={edges}
                    selectedId={selectedNodeId}
                    onSelect={setSelectedNodeId}
                  />
                ) : (
                  <Skeleton className="h-[600px] w-full" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" />Légende</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500" /><span>Profil</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /><span>Carte</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500" /><span>Adresse IP</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-purple-500" /><span>Dispositif</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500" /><span>Suspect</span></div>
              </CardContent>
            </Card>

            {selectedCard && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Carte sélectionnée</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden">
                      <CardPreview
                        programName={(Array.isArray(selectedCard.card_programs) ? selectedCard.card_programs[0]?.program_name : selectedCard.card_programs?.program_name) || 'Programme'}
                        cardType={(Array.isArray(selectedCard.card_programs) ? selectedCard.card_programs[0]?.card_type : selectedCard.card_programs?.card_type) || 'credit'}
                        cardImageUrl={programImageUrl}
                        imageOnly
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {(Array.isArray(selectedCard.profiles) ? selectedCard.profiles[0]?.full_name : selectedCard.profiles?.full_name) ||
                         (Array.isArray(selectedCard.profiles) ? selectedCard.profiles[0]?.legal_name : selectedCard.profiles?.legal_name) || 'Profil'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Carte Google Maps des IPs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Géolocalisation IP</CardTitle>
          <CardDescription>Affichage des adresses IP liées trouvées dans les transactions et profils.</CardDescription>
        </CardHeader>
        <CardContent>
          {mapPanel}
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudNetwork3D;