import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full">
        <div className="mx-auto bg-green-100 rounded-full p-4 w-fit mb-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Paiement réussi !</h1>
        <p className="text-muted-foreground mt-2 mb-8">Votre transaction a été complétée avec succès.</p>
        
        <div className="p-6 bg-white rounded-lg border text-left space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Montant payé :</span>
            <span className="font-bold text-lg">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(Number(amount) || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">ID de transaction :</span>
            <span className="font-mono text-xs bg-gray-100 p-1 rounded">{transactionId}</span>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full mt-8">
          Fermer
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;