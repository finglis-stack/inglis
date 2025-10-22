import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CreditCard, Lock, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ProcessingPaymentModal from '@/components/q12x/ProcessingPaymentModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const paymentSchema = z.object({
  cardNumber: z.string().min(18, "Le numéro de carte est requis."),
  expiresAt: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Date invalide (MM/AA)."),
  pin: z.string().length(4, "Le NIP doit contenir 4 chiffres."),
});

const PublicCheckoutPage = () => {
  const { checkoutId } = useParams();
  const [checkout, setCheckout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: "",
      expiresAt: "",
      pin: "",
    },
  });

  useEffect(() => {
    const fetchCheckoutData = async () => {
      if (!checkoutId) {
        setPaymentError("Lien de paiement invalide.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('checkouts')
        .select('*, merchant_accounts(name)')
        .eq('id', checkoutId)
        .eq('status', 'active')
        .single();

      if (checkoutError || !checkoutData) {
        setPaymentError("Ce lien de paiement est invalide ou a expiré.");
      } else {
        setCheckout(checkoutData);
      }
      setLoading(false);
    };
    fetchCheckoutData();
  }, [checkoutId]);

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const { data, error } = await supabase.functions.invoke('process-public-payment', {
        body: {
          checkoutId,
          ...values,
        },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error);
      }

      if (data.success && data.success_url) {
        window.location.href = data.success_url;
      } else {
        setIsProcessing(false);
        // Fallback au cas où il n'y a pas d'URL de succès
        form.reset();
        // Idéalement, afficher un message de succès ici
      }
    } catch (err) {
      setIsProcessing(false);
      setPaymentError(err.message || "Votre institution émettrice a refusé le paiement.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Skeleton className="h-[500px] w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <ProcessingPaymentModal isOpen={isProcessing} />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {checkout?.merchant_accounts?.name && <p className="text-muted-foreground">{checkout.merchant_accounts.name}</p>}
          <CardTitle className="text-4xl font-bold">
            {checkout?.amount ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount) : 'Paiement'}
          </CardTitle>
          {checkout?.description && <CardDescription>{checkout.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {paymentError && !isProcessing && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Paiement Refusé</AlertTitle>
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}
          {checkout ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="cardNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de carte</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="XX XXXXXX XX XXXXXXX X" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="expiresAt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="MM/AA" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="****" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={isProcessing}>
                  Payer {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount)}
                </Button>
              </form>
            </Form>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center">
          <Lock className="h-3 w-3 mr-1" /> Paiement sécurisé par Inglis Dominium
        </CardFooter>
      </Card>
    </div>
  );
};

export default PublicCheckoutPage;