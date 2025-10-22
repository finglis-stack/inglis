import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Info, MapPin } from 'lucide-react';
import { showError } from '@/utils/toast';
import AvailabilityCell from '@/components/q12x/AvailabilityCell';
import TransactionMap from '@/components/q12x/TransactionMap';

const Q12xTransactionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          merchant_balance_ledgers(available_at),
          debit_accounts (
            cards (
              user_initials, issuer_id, random_letters, unique_identifier, check_digit,
              card_programs (
                institutions ( name )
              )
            )
          ),
          credit_accounts (
            cards (
              user_initials, issuer_id, random_letters, unique_identifier, check_digit,
              card_programs (
                institutions ( name )
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Erreur de Supabase:", error);
        showError("Transaction non trouvée.");
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };
    fetchTransaction();
  }, [id]);

  useEffect(() => {
    if (transaction?.ip_address) {
      const fetchLocation = async () => {
        setLocationLoading(true);
        setLocationError(null);
        try {
          const response = await fetch(`https://ipapi.co/${transaction.ip_address}/json/`);
          const data = await response.json();
          if (data.error) {
            setLocationError(data.reason || 'Impossible de géolocaliser l\'adresse IP.');
          } else {
            setLocation(data);
          }
        } catch (e) {
          console.error("Erreur de géolocalisation:", e);
          setLocationError('Le service de géolocalisation est indisponible.');
        } finally {
          setLocationLoading(false);
        }
      };
      fetchLocation();
    }
  }, [transaction]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!transaction) {
    return (
      <div>
        <Link to="/dashboard/transactions" className="flex items-center gap-2 text-indigo-600 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux transactions
        </Link>
        <p>Transaction non trouvée.</p>
      </div>
    );
  }

  const card = transaction.debit_accounts?.cards || transaction.credit_accounts?.cards;
  const cardNumber = card ? `${card.user_initials} ${card.issuer_id} ${card.random_letters} ****${card.unique_identifier.slice(-3)} ${card.check_digit}` : 'N/A';
  const issuerName = card?.card_programs?.institutions?.name || 'Émetteur inconnu';

  return (
    <div className="space-y-6">
      <Link to="/dashboard/transactions" className="flex items-center gap-2 text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour aux transactions
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Détails de la Transaction</CardTitle>
          <CardDescription className="font-mono text-xs pt-2">{transaction.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="text-3xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{transaction.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>{new Date(transaction.created_at).toLocaleString('fr-CA')}</p>
            </div>
             <div>
              <p className="text-sm text-muted-foreground">Disponibilité des fonds</p>
              <AvailabilityCell availableAt={transaction.merchant_balance_ledgers[0]?.available_at} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Carte Utilisée</p>
              <p className="font-mono">{cardNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Émetteur de la carte</p>
              <p>{issuerName}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-indigo-900">Frais d'interchange</h4>
                <p className="text-indigo-800">0,00 $</p>
                <p className="text-xs text-indigo-700 mt-1">Les transactions sur le réseau Inglis Dominium n'ont aucun frais d'interchange.</p>
              </div>
            </div>
          </div>
          {transaction.ip_address && (
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><MapPin className="h-5 w-5" /> Géolocalisation (approximative)</h3>
              {locationLoading ? (
                <Skeleton className="h-[250px] w-full rounded-lg" />
              ) : location && location.latitude && location.longitude ? (
                <TransactionMap latitude={location.latitude} longitude={location.longitude} />
              ) : (
                <div className="h-[250px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-center p-4">
                  <p className="text-sm text-muted-foreground">{locationError || "Données de localisation non disponibles pour cette adresse IP."}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Q12xTransactionDetails;