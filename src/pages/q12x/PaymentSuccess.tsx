import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl">Paiement réussi !</CardTitle>
          <CardDescription>Votre transaction a été complétée avec succès.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md border text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant payé :</span>
              <span className="font-bold">
                {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Number(amount) || 0)}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-muted-foreground">ID de transaction :</span>
              <span className="font-mono text-xs">{transactionId}</span>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Fermer</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;