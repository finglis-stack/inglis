import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess } from '@/utils/toast';

const Step4Review = () => {
  const navigate = useNavigate();
  const { userData, resetUser } = useNewUser();

  const handleSubmit = () => {
    // Here you would typically send the data to your backend/API
    console.log('Submitting user data:', userData);
    showSuccess('Nouvel utilisateur personnel créé avec succès !');
    resetUser();
    navigate('/dashboard/users');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Vérification (4/4)</CardTitle>
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-3')}>Précédent</Button>
        <Button onClick={handleSubmit}>Soumettre</Button>
      </CardFooter>
    </Card>
  );
};

export default Step4Review;