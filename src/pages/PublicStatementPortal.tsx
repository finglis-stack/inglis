import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showError, showSuccess } from '@/utils/toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import StatementPDF from '@/components/dashboard/accounts/StatementPDF';

const PublicStatementPortal = () => {
  const { token } = useParams();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<any>(null);

  const fmt = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n);
  const interestCharged = (data?.transactions || []).filter((tx: any) => tx.type === 'interest_charge').reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const handleVerify = async () => {
    if (!token || pin.length < 4) {
      showError('Veuillez entrer un NIP valide (4 chiffres).');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('https://bsmclnbeywqosuhijhae.supabase.co/functions/v1/public-statement-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin })
      });
      const json = await res.json();
      if (!json.ok) {
        showError(json.error || 'NIP invalide.');
      } else {
        setData(json);
        showSuccess('Accès accordé.');
      }
    } catch (e: any) {
      showError(e?.message || 'Erreur lors de la vérification.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    setData(null);
    setPin('');
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Accès sécurisé au relevé</CardTitle>
            <CardDescription>Entrez le NIP du profil pour afficher le relevé et télécharger le PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!data && (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-muted-foreground mb-1">NIP du profil</label>
                  <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" className="w-full" />
                </div>
                <Button onClick={handleVerify} disabled={verifying}>{verifying ? 'Vérification...' : 'Déverrouiller'}</Button>
              </div>
            )}

            {data && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Titulaire</p>
                    <p className="font-semibold">
                      {data.profile?.type === 'personal' ? (data.profile?.full_name ?? '') : (data.profile?.legal_name ?? '')}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Institution</p>
                    <p className="font-semibold">{data.institution?.name}</p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Solde précédent</p>
                    <p className="font-semibold">{fmt(data.statement.opening_balance)}</p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Nouveau solde</p>
                    <p className="font-semibold">{fmt(data.statement.closing_balance)}</p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Paiement minimum</p>
                    <p className="font-semibold">{fmt(data.statement.minimum_payment)}</p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Échéance</p>
                    <p className="font-semibold">{new Date(data.statement.payment_due_date).toLocaleDateString('fr-CA')}</p>
                  </div>
                  <div className="p-4 bg-gray-100 rounded">
                    <p className="text-sm text-muted-foreground">Intérêts facturés</p>
                    <p className="font-semibold">{fmt(interestCharged)}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <PDFDownloadLink
                    document={
                      <StatementPDF
                        institution={data.institution}
                        profile={data.profile}
                        account={data.account}
                        statement={data.statement}
                        transactions={data.transactions}
                        interestCharged={interestCharged}
                      />
                    }
                    fileName={`Releve_${(data.institution?.name || 'Institution').replace(/\s+/g,'_')}_${data.account?.id}_${data.statement?.id}.pdf`}
                  >
                    {({ loading }) => (
                      <Button variant="outline">{loading ? 'Préparation...' : 'Télécharger le PDF du relevé'}</Button>
                    )}
                  </PDFDownloadLink>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Transactions</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.transactions || []).map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell>{new Date(tx.created_at).toLocaleDateString('fr-CA')}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                          <TableCell className={`text-right ${tx.type === 'payment' ? 'text-green-600' : ''}`}>
                            {tx.type === 'payment' ? '-' : ''}{fmt(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicStatementPortal;