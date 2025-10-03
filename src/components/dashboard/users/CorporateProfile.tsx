import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CorporateProfile = ({ profile }) => {
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
            <Building className="h-8 w-8 text-primary" />
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{profile.legal_name}</CardTitle>
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