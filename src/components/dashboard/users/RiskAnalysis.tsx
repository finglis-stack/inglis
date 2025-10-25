import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';

const RiskAnalysis = ({ assessments }) => {
  const { t } = useTranslation('dashboard');
  const [selectedAssessment, setSelectedAssessment] = useState(null);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Analyse de Risque des Transactions
          </CardTitle>
          <CardDescription>Historique des 5 dernières évaluations de risque pour ce profil.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Score de Risque</TableHead>
                <TableHead>Décision</TableHead>
                <TableHead className="text-right">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments && assessments.length > 0 ? (
                assessments.map((item) => {
                  const decisionInfo = getDecisionInfo(item.decision);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.created_at).toLocaleString('fr-CA')}</TableCell>
                      <TableCell>
                        <Badge variant={getScoreVariant(item.risk_score)}>{item.risk_score} / 100</Badge>
                      </TableCell>
                      <TableCell className={`flex items-center font-semibold ${decisionInfo.className}`}>
                        {decisionInfo.icon}
                        {decisionInfo.text}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedAssessment(item)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">Aucune évaluation de risque trouvée.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAssessment} onOpenChange={() => setSelectedAssessment(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Détails de l'Évaluation de Risque</DialogTitle>
            <DialogDescription>
              Transaction du {selectedAssessment && new Date(selectedAssessment.created_at).toLocaleString('fr-CA')}
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Score Final</h4>
                  <Badge variant={getScoreVariant(selectedAssessment.risk_score)} className="text-lg">{selectedAssessment.risk_score} / 100</Badge>
                </div>
                <div>
                  <h4 className="font-semibold">Décision Prise</h4>
                  <p className={`flex items-center font-bold text-lg ${getDecisionInfo(selectedAssessment.decision).className}`}>
                    {getDecisionInfo(selectedAssessment.decision).icon}
                    {getDecisionInfo(selectedAssessment.decision).text}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Signaux Détectés</h4>
                {selectedAssessment.signals?.riskReasons?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm bg-muted p-4 rounded-md">
                    {selectedAssessment.signals.riskReasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun signal de risque majeur détecté.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedAssessment(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RiskAnalysis;