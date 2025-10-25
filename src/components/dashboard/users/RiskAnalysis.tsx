import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, Eye, Timer, CreditCard, Calendar, KeyRound, DollarSign, Zap, Globe, Building, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const RiskAnalysis = ({ assessments }) => {
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState(null);

  useEffect(() => {
    if (selectedAssessment && selectedAssessment.transaction_id) {
      const fetchDetails = async () => {
        setDetailsLoading(true);
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*, merchant_accounts(name)')
          .eq('id', selectedAssessment.transaction_id)
          .single();
        
        let locationData = null;
        if (txData?.ip_address) {
          try {
            const response = await fetch(`https://ipapi.co/${txData.ip_address}/json/`);
            const data = await response.json();
            if (!data.error) {
              locationData = data;
            }
          } catch (e) {
            console.error("Erreur de géolocalisation:", e);
          }
        }

        setTransactionDetails({ ...txData, location: locationData });
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
    if (decision === 'BLOCK') {
      return { text: 'Bloquée', icon: <ShieldAlert className="h-4 w-4 mr-2" />, className: 'text-red-600' };
    }
    return { text: 'Autorisée', icon: <ShieldCheck className="h-4 w-4 mr-2" />, className: 'text-green-600' };
  };

  const renderTimelineItem = (icon, title, value, details) => (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{value}</p>
        {details && <p className="text-xs text-muted-foreground">{details}</p>}
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Rapport d'Analyse de Risque</DialogTitle>
            <DialogDescription>Détails complets de l'évaluation pour la transaction du {selectedAssessment && new Date(selectedAssessment.created_at).toLocaleString('fr-CA')}</DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
              {detailsLoading ? <Skeleton className="h-64 w-full md:col-span-2" /> : (
                <>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Informations Générales</h4>
                    {renderTimelineItem(<DollarSign className="h-4 w-4" />, "Montant", transactionDetails?.amount ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transactionDetails.amount) : 'N/A', null)}
                    {renderTimelineItem(<Building className="h-4 w-4" />, "Marchand", transactionDetails?.merchant_accounts?.name || 'N/A', null)}
                    {renderTimelineItem(<Hash className="h-4 w-4" />, "Jeton de carte", <span className="font-mono text-xs break-all">{selectedAssessment.signals?.card_token}</span>, null)}
                    {renderTimelineItem(<Globe className="h-4 w-4" />, "Localisation IP", `${transactionDetails?.location?.city || ''}, ${transactionDetails?.location?.country_name || ''}`, transactionDetails?.ip_address)}
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Déroulement de l'Évaluation</h4>
                    {renderTimelineItem(<CreditCard className="h-4 w-4" />, "Saisie du PAN", `${selectedAssessment.signals?.pan_entry_duration_ms} ms`, null)}
                    {renderTimelineItem(<Calendar className="h-4 w-4" />, "Saisie de l'expiration", `${selectedAssessment.signals?.expiry_entry_duration_ms} ms`, null)}
                    {renderTimelineItem(<KeyRound className="h-4 w-4" />, "Saisie du NIP", `${selectedAssessment.signals?.pin_entry_duration_ms} ms`, null)}
                    {renderTimelineItem(<Zap className="h-4 w-4" />, "Analyse de vélocité", selectedAssessment.signals?.riskReasons?.includes('Transaction velocity too high') ? 'Signal détecté' : 'OK', null)}
                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">{getDecisionInfo(selectedAssessment.decision).icon}</div>
                      <div>
                        <p className="font-semibold">Décision Finale</p>
                        <p className={`font-bold ${getDecisionInfo(selectedAssessment.decision).className}`}>{getDecisionInfo(selectedAssessment.decision).text} avec un score de {selectedAssessment.risk_score}</p>
                      </div>
                    </div>
                  </div>
                </>
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