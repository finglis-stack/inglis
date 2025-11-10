import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

interface AddToGoogleWalletButtonProps {
  cardId: string;
}

export const AddToGoogleWalletButton = ({ cardId }: AddToGoogleWalletButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleAddToWallet = async () => {
    setLoading(true);
    try {
      const { data: opaquePaymentCard, error } = await supabase.functions.invoke('create-google-opc', {
        body: { card_id: cardId },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue lors de la création de l'OPC.");
      }

      console.log("--- Opaque Payment Card (OPC) pour Google Wallet ---");
      console.log(JSON.stringify(opaquePaymentCard, null, 2));
      
      // PROCHAINE ÉTAPE POUR VOUS :
      // Ici, vous devez utiliser le SDK Google Wallet côté client
      // et lui passer l'objet `opaquePaymentCard`.
      // Exemple (pseudo-code) :
      // const googleWalletClient = new google.payments.api.PaymentsClient(...);
      // googleWalletClient.pushCard(opaquePaymentCard);

      alert("L'OPC a été généré avec succès ! Vérifiez la console du navigateur (F12) pour voir l'objet à envoyer à Google Wallet.");

    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAddToWallet} disabled={loading} variant="outline">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Wallet_logo.svg/2560px-Google_Wallet_logo.svg.png" alt="Google Wallet" className="h-4 mr-2" />}
      Ajouter à Google Wallet
    </Button>
  );
};