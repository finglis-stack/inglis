import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ShieldAlert, ShieldCheck, Timer, CreditCard, Calendar, KeyRound, DollarSign, Globe, Building, Hash, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RiskScoreGauge from '@/components/dashboard/users/RiskScoreGauge';
import { showError } from '@/utils/toast';
import RiskAnalysisLog from '@/components/dashboard/risk/RiskAnalysisLog';
import GeoVelocityMap from '@/components/dashboard/risk/GeoVelocityMap';
import { getIpCoordinates } from '@/utils/ipGeolocation';

type Assessment = {
  id: string;
  created_at: string;
  profile_id: string;
  decision: 'APPROVE' | 'BLOCK';
  risk_score: number;
  transaction_id: string | null;
  signals?: any;
};

type TxSummary = {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  type: string;
  created_at: string;
  merchant_accounts?: { name?: string | null } | null;
  ip_address?: string | null;
  authorization_code?: string | null;
};

type ProfileStats = {
  avg_transaction_amount?: number;
  transaction_amount_stddev?: number;
};

const defaultGeo = { impossible_speed_kmh: 900, very_fast_speed_kmh: 500, distance_min_km: 1 };

function haversineDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

const RiskAnalysisDetails = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [transaction, setTransaction] = useState<TxSummary | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [geoPrefs, setGeoPrefs] = useState(defaultGeo);
  const [geoLogItem, setGeoLogItem] = useState<any | null>(null);
  const [currCoords, setCurrCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [prevCoords, setPrevCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distanceKmState, setDistanceKmState] = useState<number | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!assessmentId) return;
      setLoading(true);

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('transaction_risk_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError || !assessmentData) {
        showError("Évaluation de risque non trouvée.");
        navigate('/dashboard', { replace: true });
        return;
      }

      setAssessment(assessmentData as Assessment);

      const txRes = assessmentData.transaction_id
        ? await supabase
            .from('transactions')
            .select('*, merchant_accounts(name)')
            .eq('id', assessmentData.transaction_id)
            .single()
        : { data: null, error: null };

      const profileRes = await supabase
        .from('profiles')
        .select('avg_transaction_amount, transaction_amount_stddev')
        .eq('id', assessmentData.profile_id)
        .single();

      // Charger les préférences pour les seuils géo si dispo
      const prefsRes = await supabase
        .from('fraud_preferences')
        .select('settings')
        .eq('profile_id', assessmentData.profile_id)
        .maybeSingle();

      if (prefsRes?.data?.settings?.geo) {
        const s = prefsRes.data.settings.geo;
        setGeoPrefs({
          impossible_speed_kmh: typeof s.impossible_speed_kmh === 'number' ? s.impossible_speed_kmh : defaultGeo.impossible_speed_kmh,
          very_fast_speed_kmh: typeof s.very_fast_speed_kmh === 'number' ? s.very_fast_speed_kmh : defaultGeo.very_fast_speed_kmh,
          distance_min_km: typeof s.distance_min_km === 'number' ? s.distance_min_km : defaultGeo.distance_min_km,
        });
      } else {
        setGeoPrefs(defaultGeo);
      }

      const txData = txRes.data as TxSummary | null;
      setTransaction(txData || null);
      setProfileStats(profileRes.data || null);

      // Calcul Haversine: comparer IP de cette transaction avec la dernière transaction du profil
      try {
        const currentIP = txData?.ip_address || assessmentData?.signals?.ipAddress || null;
        const currentCreatedAt = txData?.created_at || assessmentData?.created_at;

        if (currentIP && assessmentData.profile_id) {
          // Récupérer les comptes du profil
          const [debitIdsRes, creditIdsRes] = await Promise.all([
            supabase.from('debit_accounts').select('id').eq('profile_id', assessmentData.profile_id),
            supabase.from('credit_accounts').select('id').eq('profile_id', assessmentData.profile_id),
          ]);

          const debitIds = (debitIdsRes.data || []).map((d: any) => d.id);
          const creditIds = (creditIdsRes.data || []).map((c: any) => c.id);

          const orConditions: string[] = [];
          if (debitIds.length > 0) orConditions.push(`debit_account_id.in.(${debitIds.join(',')})`);
          if (creditIds.length > 0) orConditions.push(`credit_account_id.in.(${creditIds.join(',')})`);

          let lastTx: { id: string; created_at: string; ip_address: string | null } | null = null;
          if (orConditions.length > 0) {
            const { data: lastGlobal } = await supabase
              .from('transactions')
              .select('id, created_at, ip_address')
              .or(orConditions.join(','))
              .neq('id', txData?.id || '')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            lastTx = lastGlobal || null;
          }

          // Déterminer l'IP précédente: transaction ou dernière IP observée pour le profil
          let lastIp: string | null = lastTx?.ip_address || null;
          if (!lastIp) {
            const { data: lastIpRow } = await supabase
              .from('ip_addresses')
              .select('ip_address, last_seen_at')
              .eq('profile_id', assessmentData.profile_id)
              .neq('ip_address', currentIP)
              .order('last_seen_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            lastIp = lastIpRow?.ip_address || null;
          }

          const [currCoordsRes, lastCoordsRes] = await Promise.all([
            currentIP ? getIpCoordinates(currentIP) : null,
            lastIp ? getIpCoordinates(lastIp) : null,
          ]);

          const currCoordsVal = currCoordsRes;
          const lastCoordsVal = lastCoordsRes;

          if (currCoordsVal?.lat) {
            // Toujours afficher le point actuel; afficher le précédent + la ligne si disponible
            if (lastCoordsVal?.lat) {
              const distanceKm = haversineDistanceKm(
                { lat: currCoordsVal.lat, lon: currCoordsVal.lon },
                { lat: lastCoordsVal.lat, lon: lastCoordsVal.lon }
              );

              const tNow = new Date(currentCreatedAt).getTime();
              const tPrev = new Date(lastTx?.created_at || assessmentData.created_at).getTime();
              const timeDiffMinutes = Math.max((tNow - tPrev) / (1000 * 60), 0.0001);
              const timeDiffHours = timeDiffMinutes / 60;
              let speedKmh = distanceKm / (timeDiffHours || 0.0001);

              let impact = '+0';
              let resultText = `Vitesse estimée: ${Math.round(speedKmh)} km/h (${Math.round(distanceKm)} km en ${Math.round(timeDiffMinutes)} min)`;

              if (distanceKm > geoPrefs.distance_min_km) {
                if (speedKmh > geoPrefs.impossible_speed_kmh) {
                  impact = '-50';
                  resultText = `Déplacement impossible (${Math.round(speedKmh)} km/h, ${Math.round(distanceKm)} km en ${Math.round(timeDiffMinutes)} min)`;
                } else if (speedKmh > geoPrefs.very_fast_speed_kmh) {
                  impact = '-25';
                  resultText = `Déplacement très rapide (${Math.round(speedKmh)} km/h, ${Math.round(distanceKm)} km)`;
                }
              } else {
                resultText = `Déplacement local (${Math.round(distanceKm)} km) — vitesse non significative`;
              }

              // Stocker les coordonnées pour la carte
              setCurrCoords({ lat: currCoordsVal.lat, lon: currCoordsVal.lon });
              setPrevCoords({ lat: lastCoordsVal.lat, lon: lastCoordsVal.lon });
              setDistanceKmState(distanceKm);

              setGeoLogItem({
                step: 'Vélocité géographique',
                result: resultText,
                impact,
                timestamp: 0, // horodatage relatif non pertinent côté client
              });
            } else {
              // Pas d'IP précédente: afficher un seul point sans flèche
              setCurrCoords({ lat: currCoordsVal.lat, lon: currCoordsVal.lon });
              setPrevCoords(null);
              setDistanceKmState(0);
              setGeoLogItem({
                step: 'Vélocité géographique',
                result: `Aucun historique d'IP — point actuel affiché`,
                impact: '+0',
                timestamp: 0,
              });
            }
          }
        }
      } catch (geoErr) {
        // On n’affiche pas de toast ici; l’absence de géo ne doit pas bloquer la page
        console.error('Erreur calcul Haversine (client):', geoErr);
      }

      setLoading(false);
    };
    fetchDetails();
  }, [assessmentId, navigate]);

  const getDecisionInfo = (decision: 'APPROVE' | 'BLOCK') => {
    if (decision === 'BLOCK') return { text: 'Bloquée', icon: <ShieldAlert className="h-5 w-5" />, className: 'text-red-600' };
    return { text: 'Autorisée', icon: <ShieldCheck className="h-5 w-5" />, className: 'text-green-600' };
  };

  const renderDetailItem = (icon: any, title: string, value: any) => (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );

  if (loading || !assessment) {
    return <div className="p-8"><Skeleton className="h-screen w-full" /></div>;
  }

  const decisionInfo = getDecisionInfo(assessment.decision);
  const transactionAmount = transaction?.amount ?? assessment.signals?.amount;
  const merchantName = transaction?.merchant_accounts?.name ?? assessment.signals?.merchant_name;
  const locationDisplay = (() => {
    const ipLoc = assessment?.signals?.ipAddress; // l’IP courante peut ne pas être re‑géolocalisée ici
    return transaction?.ip_address ? (ipLoc ? ipLoc : 'N/A') : 'N/A';
  })();

  // Fusionner le log d’analyse avec l’item géo calculé côté client
  const baseLogRaw = assessment.signals?.analysis_log;
  const baseLog = Array.isArray(baseLogRaw) ? baseLogRaw : [];
  const combinedLog = (() => {
    if (geoLogItem) {
      // Éviter les doublons s’il existe déjà une entrée "Vélocité géographique"
      const hasGeo = baseLog.some((it) => String(it.step).toLowerCase().includes('vélocité géographique'));
      return hasGeo ? baseLog : [...baseLog, geoLogItem];
    }
    return baseLog;
  })();

  const riskSignals = combinedLog.filter((log: any) => {
    const impactVal = typeof log.impact === 'number' ? log.impact : parseInt(String(log.impact), 10);
    return !isNaN(impactVal) && impactVal < 0;
  });

  return (
    <div className="p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader className="items-center text-center">
              <CardTitle>Score de Confiance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <RiskScoreGauge score={assessment.risk_score} />
              <div className={`flex items-center font-bold text-lg ${decisionInfo.className}`}>
                {decisionInfo.icon}
                <span>{decisionInfo.text}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Signaux de Risque Détectés</CardTitle></CardHeader>
            <CardContent>
              {riskSignals.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {riskSignals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-destructive">
                      <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{signal.result} ({signal.impact})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun signal de risque majeur détecté.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contexte de la Transaction</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {renderDetailItem(<DollarSign className="h-5 w-5" />, "Montant", transactionAmount ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transactionAmount) : 'N/A')}
              {renderDetailItem(<Building className="h-5 w-5" />, "Marchand", merchantName || 'N/A')}
              {renderDetailItem(<Globe className="h-5 w-5" />, "Localisation IP", locationDisplay)}
              {renderDetailItem(<User className="h-5 w-5" />, "User Agent", <span className="text-xs">{assessment.signals?.user_agent || 'N/A'}</span>)}
              {renderDetailItem(<Hash className="h-5 w-5" />, "ID Transaction", assessment.transaction_id || 'N/A')}
              {renderDetailItem(<Hash className="h-5 w-5" />, "Code d'autorisation", transaction?.authorization_code || 'N/A')}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Analyse Comportementale</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {renderDetailItem(<CreditCard className="h-5 w-5" />, "Saisie du PAN", `${assessment.signals?.pan_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(<Calendar className="h-5 w-5" />, "Saisie de l'expiration", `${assessment.signals?.expiry_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(<KeyRound className="h-5 w-5" />, "Saisie du NIP", `${assessment.signals?.pin_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(
                  <Timer className="h-5 w-5" />,
                  "Cadence NIP (moy/chiffre)",
                  (() => {
                    const v = assessment.signals?.pin_inter_digit_avg_ms;
                    if (typeof v === 'number') return `${v.toFixed(0)} ms`;
                    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return `${Number(v).toFixed(0)} ms`;
                    return 'N/A';
                  })()
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Profil de Risque (Baseline)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {profileStats?.avg_transaction_amount && profileStats.avg_transaction_amount > 0 ? (
                  <>
                    {renderDetailItem(<BarChart3 className="h-5 w-5" />, "Montant moyen", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(profileStats.avg_transaction_amount))}
                    {renderDetailItem(<BarChart3 className="h-5 w-5" />, "Écart-type", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(profileStats.transaction_amount_stddev || 0))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun historique pour établir une baseline.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {combinedLog && combinedLog.length > 0 && (
        <div className="mt-6 space-y-4">
          <RiskAnalysisLog log={combinedLog} />
          {currCoords && (
            <GeoVelocityMap
              current={{ lat: currCoords.lat, lon: currCoords.lon }}
              previous={distanceKmState && distanceKmState > 0 && prevCoords ? { lat: prevCoords.lat, lon: prevCoords.lon } : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RiskAnalysisDetails;