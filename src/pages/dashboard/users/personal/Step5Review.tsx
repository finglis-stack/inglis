import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Step5Review = () => {
  const navigate = useNavigate();
  const { userData, resetUser } = useNewUser();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    if (consent && userData.sin) {
      // ... (logique du bureau de crédit reste la même)
    }

    const profileData = {
      full_name: userData.fullName,
      address: userData.address,
      phone: userData.phone,
      email: userData.email,
      dob: userData.dob,
      pin: userData.pin,
      sin: userData.sin || null,
    };

    try {
      const { error } = await supabase.functions.invoke('create-personal-profile', {
        body: profileData,
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }

      showSuccess('Nouvel utilisateur personnel créé avec succès !');
      resetUser();
      navigate('/dashboard/users');
    } catch (error) {
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Vérification (5/5)</CardTitle>
        <CardDescription>Veuillez vérifier que toutes les informations sont correctes avant de soumettre.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Nom complet</h4>
          <p className="text-muted-foreground">{userData.fullName}</p>
        </div>
        <div>
          <h4 className="font-semibold">Adresse</h4>
          <p className="text-muted-foreground">{userData.address?.street}, {userData.address?.city}, {userData.address?.province}, {userData.address?.postalCode}, {userData.address?.country}</p>
        </div>
        <div>
          <h4 className="font-semibold">Contact</h4>
          <p className="text-muted-foreground">Téléphone: {userData.phone}</p>
          <p className="text-muted-foreground">Email: {userData.email}</p>
        </div>
        <div>
          <h4 className="font-semibold">Identité</h4>
          <p className="text-muted-foreground">Date de naissance: {userData.dob}</p>
          <p className="text-muted-foreground">NAS: {userData.sin ? '***-***-***' : 'Non fourni'}</p>
        </div>
         <div>
          <h4 className="font-semibold">NIP</h4>
          <p className="text-muted-foreground">****</p>
        </div>
        <div className="items-top flex space-x-2 pt-4">
          <Checkbox id="terms1" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="terms1" className="font-bold">
              Consentement au partage d'informations
            </Label>
            <p className="text-sm text-muted-foreground">
              Je consens au partage des informations de ce profil avec le bureau de crédit à des fins de vérification et de rapport.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-4')} disabled={loading}>Précédent</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Soumission...' : 'Soumettre'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Step5Review;