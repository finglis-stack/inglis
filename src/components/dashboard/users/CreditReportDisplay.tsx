import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type PaymentLevel = {
  account_id: string;
  program_name?: string;
  rating: string; // R1...R9
  stats?: {
    months_reviewed?: number;
    on_time?: number;
    late?: number;
    missed?: number;
    average_utilization?: number;
    recent_on_time_ratio?: number;
    previous_on_time_ratio?: number;
  };
  computed_at?: string;
};

const CreditReportDisplay = ({ report }) => {
  const { t } = useTranslation('dashboard');

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-500';
    if (score >= 740) return 'text-lime-500';
    if (score >= 670) return 'text-yellow-500';
    if (score >= 580) return 'text-orange-500';
    return 'text-red-500';
  };

  const paymentLevels: PaymentLevel[] = Array.isArray(report.payment_levels) ? report.payment_levels : [];
  const metrics = report.credit_metrics || {};

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('userProfile.creditReportTitle')}</CardTitle>
        <CardDescription>{t('userProfile.creditReportDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* En-tête avec identité et score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 space-y-2">
            <h4 className="font-semibold">{report.full_name}</h4>
            <p className="text-sm text-muted-foreground">NAS: ***-***-{(report.ssn || '').slice(-3)}</p>
            <p className="text-sm text-muted-foreground">
              {report.address?.street}{report.address?.street ? ', ' : ''}{report.address?.city}{report.address?.province ? ', ' + report.address?.province : ''}{report.address?.postalCode ? ' ' + report.address?.postalCode : '' }
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="font-semibold text-muted-foreground">{t('userProfile.creditScore')}</p>
            <p className={`text-5xl font-mono font-bold ${getScoreColor(report.credit_score)}`}>
              {report.credit_score ?? 'N/A'}
            </p>
            {metrics?.final_score && (
              <p className="mt-1 text-xs text-muted-foreground">Score calculé: {metrics.final_score}</p>
            )}
          </div>
        </div>

        {/* Tableau niveaux de paiement */}
        {paymentLevels.length > 0 && (
          <>
            <h4 className="font-semibold mb-2">Niveau de paiement (R1–R9)</h4>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compte</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Mois analysés</TableHead>
                    <TableHead>À temps</TableHead>
                    <TableHead>Retards</TableHead>
                    <TableHead>Manqués</TableHead>
                    <TableHead>Utilisation moy.</TableHead>
                    <TableHead>Calculé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentLevels.map((pl, idx) => (
                    <TableRow key={pl.account_id || idx}>
                      <TableCell className="text-xs">{pl.program_name || pl.account_id}</TableCell>
                      <TableCell className="font-mono font-bold">{pl.rating}</TableCell>
                      <TableCell className="text-xs">{pl.stats?.months_reviewed ?? 'N/A'}</TableCell>
                      <TableCell className="text-xs">{pl.stats?.on_time ?? 0}</TableCell>
                      <TableCell className="text-xs">{pl.stats?.late ?? 0}</TableCell>
                      <TableCell className="text-xs">{pl.stats?.missed ?? 0}</TableCell>
                      <TableCell className="text-xs">{typeof pl.stats?.average_utilization === 'number' ? `${(pl.stats.average_utilization * 100).toFixed(1)}%` : 'N/A'}</TableCell>
                      <TableCell className="text-xs">{pl.computed_at ? new Date(pl.computed_at).toLocaleString('fr-CA') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Metrics résumé */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-3 border rounded-md">
              <p className="text-xs text-muted-foreground">Comptes actifs</p>
              <p className="text-lg font-semibold">{metrics.active_accounts ?? 'N/A'}</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="text-xs text-muted-foreground">Paiements à temps</p>
              <p className="text-lg font-semibold">{metrics.payments?.on_time ?? 0} / {metrics.payments?.months_reviewed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Retards: {metrics.payments?.late ?? 0} · Manqués: {metrics.payments?.missed ?? 0}</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="text-xs text-muted-foreground">Utilisation moyenne</p>
              <p className="text-lg font-semibold">{typeof metrics.utilization_ratio === 'number' ? `${(metrics.utilization_ratio * 100).toFixed(1)}%` : 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Historique de crédit existant */}
        <h4 className="font-semibold mt-6 mb-2">{t('userProfile.creditHistory')}</h4>
        <div className="border rounded-md max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('userProfile.date')}</TableHead>
                <TableHead>{t('userProfile.type')}</TableHead>
                <TableHead>{t('userProfile.details')}</TableHead>
                <TableHead>{t('userProfile.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(report.credit_history) && report.credit_history.length > 0 ? (
                report.credit_history.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="text-xs">{item.details}</TableCell>
                    <TableCell className={item.status === 'Late' ? 'text-red-600 font-bold' : ''}>{item.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">{t('userProfile.noCreditHistory')}</TableCell>
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