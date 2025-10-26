import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Shield, ShieldAlert, ShieldCheck, Timer, CreditCard, Calendar, KeyRound, DollarSign, Globe, Building, Hash, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RiskScoreGauge from '@/components/dashboard/users/RiskScoreGauge';
import { showError } from '@/utils/toast';
import RiskAnalysisLog from '@/components/dashboard/risk/RiskAnalysisLog';

const RiskAnalysisDetails = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [details, setDetails] = useState(null);

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
        navigate(-1);
        return;
      }
      setAssessment(assessmentData);

      const transactionPromise = assessmentData.transaction_id 
        ? supabase.from('transactions').select('*, merchant_accounts(name)').eq('id', assessmentData.transaction_id).single()
        : Promise.resolve({ data: null, error: null });

      const profilePromise = supabase.from('profiles').select('avg_transaction_amount, transaction_amount_stddev').eq('id', assessmentData.profile_id).single();

      const [txRes, profileRes] = await Promise.all([transactionPromise, profilePromise]);

      let locationData = null;
      const ip = txRes.data?.ip_address || assessmentData.signals?.ipAddress;
      if (ip) {
        try {
          const response = await fetch(`https://ipapi.co/${ip}/json/`);
          const data = await response.json();
          if (!data.error) locationData = data;
        } catch (e) { console.error("Erreur de géolocalisation:", e); }
      }

      setDetails({
        transaction: { ...txRes.data, location: locationData },
        profile: profileRes.data,
      });
      setLoading(false);
    };
    fetchDetails();
  }, [assessmentId, navigate]);

  const getDecisionInfo = (decision) => {
    if (decision === 'BLOCK') return { text: 'Bloquée', icon: <ShieldAlert className="h-5 w-5" />, className: 'text-red-600' };
    return { text: 'Autorisée', icon: <ShieldCheck className="h-5 w-5" />, className: 'text-green-600' };
  };

  const renderDetailItem = (icon, title, value) => (
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
  const transactionAmount = details?.transaction?.amount ?? assessment.signals?.amount;
  const merchantName = details?.transaction?.merchant_accounts?.name ?? assessment.signals?.merchant_name;
  const locationDisplay = details?.transaction?.location ? `${details.transaction.location.city}, ${details.transaction.location.country_name}` : 'N/A';
  
  const riskSignals = assessment.signals?.analysis_log?.filter(log => parseInt(log.impact) > 0) || [];

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
              {renderDetailItem(<Hash className="h-5 w-5" />, "Code d'autorisation", details?.transaction?.authorization_code || 'N/A')}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Analyse Comportementale</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {renderDetailItem(<CreditCard className="h-5 w-5" />, "Saisie du PAN", `${assessment.signals?.pan_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(<Calendar className="h-5 w-5" />, "Saisie de l'expiration", `${assessment.signals?.expiry_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(<KeyRound className="h-5 w-5" />, "Saisie du NIP", `${assessment.signals?.pin_entry_duration_ms ?? 'N/A'} ms`)}
                {renderDetailItem(<Timer className="h-5 w-5" />, "Cadence NIP (moy/chiffre)", `${assessment.signals?.pin_inter_digit_avg_ms?.toFixed(0) ?? 'N/A'} ms`)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Profil de Risque (Baseline)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {details?.profile?.avg_transaction_amount > 0 ? (
                  <>
                    {renderDetailItem(<BarChart3 className="h-5 w-5" />, "Montant moyen", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(details.profile.avg_transaction_amount))}
                    {renderDetailItem(<BarChart3 className="h-5 w-5" />, "Écart-type", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(details.profile.transaction_amount_stddev))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun historique pour établir une baseline.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {assessment.signals?.analysis_log && (
        <div className="mt-6">
          <RiskAnalysisLog log={assessment.signals.analysis_log} />
        </div>
      )}
    </div>
  );
};

export default RiskAnalysisDetails;