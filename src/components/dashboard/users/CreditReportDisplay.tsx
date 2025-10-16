import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const CreditReportDisplay = ({ report }) => {
  const getScoreColor = (score) => {
    if (score >= 800) return 'text-green-500';
    if (score >= 740) return 'text-lime-500';
    if (score >= 670) return 'text-yellow-500';
    if (score >= 580) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Dossier de Crédit Consulté</CardTitle>
        <CardDescription>Ce dossier a été récupéré avec le consentement de l'utilisateur.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 space-y-2">
            <h4 className="font-semibold">{report.full_name}</h4>
            <p className="text-sm text-muted-foreground">NAS: ***-***-{report.ssn.slice(6)}</p>
            <p className="text-sm text-muted-foreground">{report.address?.street}, {report.address?.city}, {report.address?.province}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="font-semibold text-muted-foreground">SCORE DE CRÉDIT</p>
            <p className={`text-5xl font-mono font-bold ${getScoreColor(report.credit_score)}`}>
              {report.credit_score ?? 'N/A'}
            </p>
          </div>
        </div>
        <h4 className="font-semibold mb-2">Historique de Crédit</h4>
        <div className="border rounded-md max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.credit_history?.length > 0 ? (
                report.credit_history.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="text-xs">{item.details}</TableCell>
                    <TableCell className={item.status === 'Late' ? 'text-red-600 font-bold' : ''}>{item.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Aucun historique de crédit disponible</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditReportDisplay;