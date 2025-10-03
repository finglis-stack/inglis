import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';

const PersonalProfile = ({ profile }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <User className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
              <CardDescription>Profil Personnel</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations de Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Email:</strong> {profile.email || 'N/A'}</p>
            <p><strong>Téléphone:</strong> {profile.phone || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>{profile.address?.street}</p>
            <p>{profile.address?.city}, {profile.address?.province} {profile.address?.postalCode}</p>
            <p>{profile.address?.country}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations d'Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Date de naissance:</strong> {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Numéro d'assurance sociale:</strong> {profile.sin || 'Non fourni'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalProfile;