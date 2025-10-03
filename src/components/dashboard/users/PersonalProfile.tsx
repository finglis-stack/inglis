import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const PersonalProfile = ({ profile }) => {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { text: 'Actif', className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' };
      case 'attention':
        return { text: 'Attention', className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200' };
      case 'risky':
        return { text: 'Risqué', className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' };
      default:
        return { text: 'Inconnu', className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' };
    }
  };

  const statusInfo = getStatusInfo(profile.status);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <User className="h-8 w-8 text-primary" />
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={cn('cursor-pointer', statusInfo.className)}>{statusInfo.text}</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p><strong>Score de risque :</strong> {profile.risk_score}/100</p>
                    <p className="text-sm text-muted-foreground">Le compte est considéré comme {statusInfo.text.toLowerCase()} car [raison à définir].</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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