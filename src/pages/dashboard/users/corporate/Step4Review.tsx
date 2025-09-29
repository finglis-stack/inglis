import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Step4Review = () => {
  const navigate = useNavigate();
  const { userData, resetUser } = useNewUser();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showError("Vous n'êtes pas authentifié. Veuillez vous reconnecter.");
      setLoading(false);
      navigate('/login');
      return;
    }

    const profileData = {
      created_by_user_id: user.id,
      type: 'corporate',
      legal_name: userData.legalName,
      operating_name: userData.operatingName || null,
      business_number: userData.businessNumber,
      jurisdiction: userData.jurisdiction,
      business_address: userData.businessAddress,
    };

    const { error } = await supabase.from('profiles').insert([profileData]);

    if (error) {
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } else {
      showSuccess('Nouvel utilisateur corporatif créé avec succès !');
      resetUser();
      navigate('/dashboard/users');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Vérification (4/4)</CardTitle>
        <CardDescription>Veuillez vérifier que toutes les informations sont correctes avant de soumettre.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Nom de l'entreprise</h4>
          <p className="text-muted-foreground">Légal: {userData.legalName}</p>
          <p className="text-muted-foreground">Commercial: {userData.operatingName || 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold">Enregistrement</h4>
          <p className="text-muted-foreground">Numéro d'entreprise: {userData.businessNumber}</p>
          <p className="text-muted-foreground">Juridiction: {userData.jurisdiction}</p>
        </div>
        <div>
          <h4 className="font-semibold">Adresse</h4>
          <p className="text-muted-foreground">{userData.businessAddress?.street}, {userData.businessAddress?.city}, {userData.businessAddress?.province}, {userData.businessAddress?.postalCode}, {userData.businessAddress?.country}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/corporate/step-3')} disabled={loading}>Précédent</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Soumission...' : 'Soumettre'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Step4Review;