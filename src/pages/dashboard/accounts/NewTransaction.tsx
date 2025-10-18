import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const NewTransaction = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isCredit = location.pathname.includes('/credit/');
  const accountType = isCredit ? 'credit' : 'debit';
  const backUrl = `/dashboard/accounts/${accountType}/${accountId}`;

  const [cardId, setCardId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [captureOption, setCaptureOption] = useState('now');
  const [captureHours, setCaptureHours] = useState([1]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchCardId = async () => {
      const tableName = isCredit ? 'credit_accounts' : 'debit_accounts';
      const { data, error } = await supabase
        .from(tableName)
        .select('card_id')
        .eq('id', accountId)
        .single();

      if (error || !data) {
        showError("Impossible de trouver le compte associé.");
        navigate('/dashboard/cards');
      } else {
        setCardId(data.card_id);
      }
      setInitializing(false);
    };
    fetchCardId();
  }, [accountId, isCredit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transactionAmount = parseFloat(amount);
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      showError("Veuillez entrer un montant valide.");
      return;
    }
    if (!merchant.trim()) {
      showError("Veuillez entrer un nom de marchand.");
      return;
    }

    setLoading(true);
    try {
      // Note: The capture delay is a UI concept for now. The transaction is processed immediately.
      const { error } = await supabase.rpc('process_transaction', {
        p_card_id: cardId,
        p_amount: transactionAmount,
        p_type: 'purchase',
        p_description: merchant,
      });

      if (error) throw error;

      showSuccess("Transaction de débit ajoutée avec succès !");
      navigate(backUrl);
    } catch (err) {
      showError(`Erreur lors de la transaction : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Link to={backUrl} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au compte
      </Link>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Ajouter un Débit Manuel</CardTitle>
          <CardDescription>Simulez une nouvelle transaction d'achat pour ce compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="amount">Montant de la transaction</Label>
              <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="merchant">Nom du marchand</Label>
              <Input id="merchant" placeholder="Ex: Café Central" value={merchant} onChange={(e) => setMerchant(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Délai de capture</Label>
              <RadioGroup value={captureOption} onValueChange={setCaptureOption} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="now" id="now" />
                  <Label htmlFor="now">Immédiatement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="later" id="later" />
                  <Label htmlFor="later">Plus tard</Label>
                </div>
              </RadioGroup>
            </div>
            {captureOption === 'later' && (
              <div className="grid gap-2 pt-2">
                <Label htmlFor="captureHours">Capturer dans {captureHours[0]} heure(s)</Label>
                <Slider id="captureHours" min={1} max={96} step={1} value={captureHours} onValueChange={setCaptureHours} />
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Traitement...' : 'Ajouter le débit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTransaction;