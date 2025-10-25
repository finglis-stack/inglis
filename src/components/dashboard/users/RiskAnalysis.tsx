import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, Eye, Timer, CreditCard, Calendar, KeyRound, DollarSign, Zap, Globe, Building, Hash, BarChart3, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import RiskScoreGauge from './RiskScoreGauge';

const RiskAnalysis = ({ assessments }) => {
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [fullDetails, setFullDetails] = useState(null);

  useEffect(() => {
    if (selectedAssessment) {
      const fetchDetails = async () => {
        setDetailsLoading(true);
        
        const transactionPromise = selectedAssessment.transaction_id 
          ? supabase.from('transactions').select('*, merchant_accounts(name)').eq('id', selectedAssessment.transaction_id).single()
          : Promise.resolve({ data: null, error: null });

        const profilePromise = supabase.from('profiles').select('avg_transaction_amount, transaction_amount_stddev').eq('id', selectedAssessment.profile_id).single();

        const [txRes, profileRes] = await Promise.all([transactionPromise, profilePromise]);

        let locationData = null;
        if (txRes.data?.ip_address) {
          try {
            const response = await fetch(`https://ipapi.co/${txRes.data.ip_address}/json/`);
            const data = await response.json();
            if (!data.error) locationData = data;
          } catch (e) { console.error("Erreur de géolocalisation:", e); }
        }

        setFullDetails({
          transaction: { ...txRes.data, location: locationData },
          profile: profileRes.data,
        });
        setDetailsLoading(false);
      };
      fetchDetails();
    }
  }, [selectedAssessment]);

  const getScoreVariant = (score) => {
    if (score >= 60) return 'destructive';
    if (score >= 30) return 'secondary';
    return 'default';
  };

  const getDecisionInfo = (decision) => {
    if (decision === 'BLOCK') return { text: 'Bloquée', icon: <ShieldAlert className="h-4 w-4 mr-2" />, className: 'text-red-600' };
    return { text: 'Autorisée', icon: <ShieldCheck className="h-4 w-4 mr-2" />, className: 'text-green-600' };
  };

  const renderDetailItem = (icon, title, value) => (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Analyse de Risque des Transactions</CardTitle>
          <CardDescription>Historique des 5 dernières évaluations de risque pour ce profil.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Score</TableHead><TableHead>Décision</TableHead><TableHead className="text-right">Détails</TableHead></TableRow></TableHeader>
            <TableBody>
              {assessments && assessments.length > 0 ? (
                assessments.map((item) => {
                  const decisionInfo = getDecisionInfo(item.decision);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.created_at).toLocaleString('fr-CA')}</TableCell>
                      <TableCell><Badge variant={getScoreVariant(item.risk_score)}>{item.risk_score} / 100</Badge></TableCell>
                      <TableCell className={`flex items-center font-semibold ${decisionInfo.className}`}>{decisionInfo.icon}{decisionInfo.text}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setSelectedAssessment(item)}><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">Aucune évaluation de risque trouvée.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAssessment} onOpenChange={() => setSelectedAssessment(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Rapport d'Analyse de Risque</DialogTitle>
            <DialogDescription>Détails complets de l'évaluation du {selectedAssessment && new Date(selectedAssessment.created_at).toLocaleString('fr-CA')}</DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-4">
              {detailsLoading ? <Skeleton className="h-96 w-full" /> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 flex flex-col items-center space-y-4">
                    <RiskScoreGauge score={selectedAssessment.risk_score} />
                    <div className="text-center">
                      <p className="font-semibold">Décision Finale</p>
                      <p className={`font-bold text-lg ${getDecisionInfo(selectedAssessment.decision).className}`}>{getDecisionInfo(selectedAssessment.decision).text}</p>
                    </div>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Contexte de la Transaction</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {renderDetailItem(<DollarSign className="h-4 w-4 text-muted-foreground" />, "Montant", fullDetails?.transaction?.amount ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(fullDetails.transaction.amount) : 'N/A')}
                        {renderDetailItem(<Building className="h-4 w-4 text-muted-foreground" />, "Marchand", fullDetails?.transaction?.merchant_accounts?.name || 'N/A')}
                        {renderDetailItem(<Globe className="h-4 w-4 text-muted-foreground" />, "Localisation IP", `${fullDetails?.transaction?.location?.city || ''}, ${fullDetails?.transaction?.location?.country_name || ''}`)}
                        {renderDetailItem(<User className="h-4 w-4 text-muted-foreground" />, "User Agent", <span className="text-xs">{selectedAssessment.signals?.user_agent}</span>)}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Analyse Comportementale</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {renderDetailItem(<CreditCard className="h-4 w-4 text-muted-foreground" />, "Saisie du PAN", `${selectedAssessment.signals?.pan_entry_duration_ms} ms`)}
                        {renderDetailItem(<Calendar className="h-4 w-4 text-muted-foreground" />, "Saisie de l'expiration", `${selectedAssessment.signals?.expiry_entry_duration_ms} ms`)}
                        {renderDetailItem(<KeyRound className="h-4 w-4 text-muted-foreground" />, "Saisie du NIP", `${selectedAssessment.signals?.pin_entry_duration_ms} ms`)}
                        {renderDetailItem(<Zap className="h-4 w-4 text-muted-foreground" />, "Analyse de vélocité", selectedAssessment.signals?.riskReasons?.includes('Transaction velocity too high') ? 'Signal détecté' : 'OK')}
                      </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                      <CardHeader><CardTitle className="text-base">Profil de Risque de l'Utilisateur (Baseline)</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        {fullDetails?.profile?.avg_transaction_amount > 0 ? (
                          <>
                            {renderDetailItem(<BarChart3 className="h-4 w-4 text-muted-foreground" />, "Montant moyen des transactions", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(fullDetails.profile.avg_transaction_amount))}
                            {renderDetailItem(<BarChart3 className="h-4 w-4 text-muted-foreground" />, "Écart-type des montants", new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(fullDetails.profile.transaction_amount_stddev))}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucun historique de transaction pour établir une baseline.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setSelectedAssessment(null)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RiskAnalysis;