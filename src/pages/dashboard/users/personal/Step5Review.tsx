import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const Step5Review = () => {
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

    const { data: institution, error: institutionError } = await supabase
      .from('institutions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (institutionError || !institution) {
      showError("Impossible de trouver l'institution associée à votre compte.");
      setLoading(false);
      return;
    }

    const profileData = {
      institution_id: institution.id,
      type: 'personal',
      full_name: userData.fullName,
      address: userData.address,
      phone: userData.phone,
      email: userData.email,
      dob: userData.dob,
      sin: userData.sin || null,
      pin: userData.pin,
    };

    const { error } = await supabase.from('profiles').insert([profileData]);

    if (error) {
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } else {
      showSuccess('Nouvel utilisateur personnel créé avec succès !');
      resetUser();
      navigate('/dashboard/users');
    }
    setLoading(false);
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
          <p className="text-muted-foreground">NAS: {userData.sin || 'Non fourni'}</p>
        </div>
         <div>
          <h4 className="font-semibold">NIP</h4>
          <p className="text-muted-foreground">****</p>
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