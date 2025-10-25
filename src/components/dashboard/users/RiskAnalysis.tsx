import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';

const RiskAnalysis = ({ assessments }) => {
  const navigate = useNavigate();

  const getScoreVariant = (score) => {
    if (score <= 40) return 'destructive';
    if (score <= 70) return 'secondary';
    return 'default';
  };

  const getDecisionInfo = (decision) => {
    if (decision === 'BLOCK') {
      return { text: 'Bloquée', icon: <ShieldAlert className="h-4 w-4 mr-2" />, className: 'text-red-600' };
    }
    return { text: 'Autorisée', icon: <ShieldCheck className="h-4 w-4 mr-2" />, className: 'text-green-600' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Analyse de Risque des Transactions</CardTitle>
        <CardDescription>Historique des 5 dernières évaluations de risque pour ce profil.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Score de Confiance</TableHead><TableHead>Décision</TableHead><TableHead className="text-right">Détails</TableHead></TableRow></TableHeader>
          <TableBody>
            {assessments && assessments.length > 0 ? (
              assessments.map((item) => {
                const decisionInfo = getDecisionInfo(item.decision);
                return (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.created_at).toLocaleString('fr-CA')}</TableCell>
                    <TableCell><Badge variant={getScoreVariant(item.risk_score)}>{item.risk_score} / 100</Badge></TableCell>
                    <TableCell className={`flex items-center font-semibold ${decisionInfo.className}`}>{decisionInfo.icon}{decisionInfo.text}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/risk-analysis/${item.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
  );
};

export default RiskAnalysis;