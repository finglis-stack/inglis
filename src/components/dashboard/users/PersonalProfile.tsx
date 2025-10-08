import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, calculateAge } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const PersonalProfile = ({ profile, decryptedSin, decryptedAddress }) => {
  const { t } = useTranslation();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { text: t('dashboard.userProfile.statusActive'), className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' };
      case 'attention':
        return { text: t('dashboard.userProfile.statusAttention'), className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200' };
      case 'risky':
        return { text: t('dashboard.userProfile.statusRisky'), className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' };
      default:
        return { text: t('dashboard.userProfile.statusUnknown'), className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' };
    }
  };

  const statusInfo = getStatusInfo(profile.status);
  const age = profile.dob ? calculateAge(profile.dob) : null;
  const ageTags = [];

  if (age !== null) {
    if (age < 18) {
      ageTags.push({ text: t('dashboard.userProfile.tagMinor'), className: 'bg-blue-100 text-blue-800 border-blue-200' });
    } else if (age <= 19) {
      ageTags.push({ text: t('dashboard.userProfile.tagTeen'), className: 'bg-indigo-100 text-indigo-800 border-indigo-200' });
    } else if (age < 21) {
      ageTags.push({ text: t('dashboard.userProfile.tagYoungAdult'), className: 'bg-purple-100 text-purple-800 border-purple-200' });
    }
  }

  const formattedDob = profile.dob ? format(new Date(profile.dob + 'T00:00:00'), 'dd/MM/yyyy') : 'N/A';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <User className="h-8 w-8 text-primary" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={cn('cursor-pointer', statusInfo.className)}>{statusInfo.text}</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p><strong>{t('dashboard.userProfile.riskScore')}:</strong> {profile.risk_score}/100</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.userProfile.riskReason', { status: statusInfo.text.toLowerCase() })}</p>
                  </TooltipContent>
                </Tooltip>
                {ageTags.map((tag, index) => (
                  <Badge key={index} className={cn(tag.className)}>{tag.text}</Badge>
                ))}
              </div>
              <CardDescription>{t('dashboard.userProfile.personalProfileTitle')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('dashboard.userProfile.email')}:</strong> {profile.email || 'N/A'}</p>
            <p><strong>{t('dashboard.userProfile.phone')}:</strong> {profile.phone || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile.address')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {decryptedAddress ? (
              <>
                <p>{decryptedAddress.street}</p>
                <p>{decryptedAddress.city}, {decryptedAddress.province} {decryptedAddress.postalCode}</p>
                <p>{decryptedAddress.country}</p>
              </>
            ) : (
              <p>{profile.address ? t('dashboard.userProfile.addressLocked') : t('dashboard.userProfile.addressNotProvided')}</p>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile.identityInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('dashboard.userProfile.dob')}:</strong> {formattedDob}</p>
            <p><strong>{t('dashboard.userProfile.sin')}:</strong> {decryptedSin || (profile.sin ? t('dashboard.userProfile.sinLocked') : t('dashboard.userProfile.sinNotProvided'))}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalProfile;