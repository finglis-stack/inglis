import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';

const CorporateProfile = ({ profile }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">{profile.legal_name}</CardTitle>
              <CardDescription>Profil Corporatif {profile.operating_name && `(Opérant sous ${profile.operating_name})`}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations d'Enregistrement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Numéro d'entreprise:</strong> {profile.business_number || 'N/A'}</p>
            <p><strong>Juridiction:</strong> {profile.jurisdiction || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adresse de l'Entreprise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>{profile.business_address?.street}</p>
            <p>{profile.business_address?.city}, {profile.business_address?.province} {profile.business_address?.postalCode}</p>
            <p>{profile.business_address?.country}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CorporateProfile;