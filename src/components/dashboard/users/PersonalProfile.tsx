import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, calculateAge } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import UserAccounts from './UserAccounts';

const PersonalProfile = ({ profile, decryptedSin, decryptedAddress, cards, creditAccounts, debitAccounts, profileId }) => {
  const { t } = useTranslation('dashboard');

  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { text: t('userProfile.statusActive'), className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' };
      case 'attention':
        return { text: t('userProfile.statusAttention'), className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200' };
      case 'risky':
        return { text: t('userProfile.statusRisky'), className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' };
      default:
        return { text: t('userProfile.statusUnknown'), className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200' };
    }
  };

  const statusInfo = getStatusInfo(profile.status);
  const age = profile.dob ? calculateAge(profile.dob) : null;
  const ageTags = [];

  if (age !== null) {
    if (age < 18) {
      ageTags.push({ text: t('userProfile.tagMinor'), className: 'bg-blue-100 text-blue-800 border-blue-200' });
    }
    if (age >= 12 && age <= 19) {
      ageTags.push({ text: t('userProfile.tagTeen'), className: 'bg-indigo-100 text-indigo-800 border-indigo-200' });
    }
    if (age >= 20 && age <= 25) {
      ageTags.push({ text: t('userProfile.tagYoungAdult'), className: 'bg-purple-100 text-purple-800 border-purple-200' });
    }
  }

  const formattedDob = profile.dob ? format(parseISO(profile.dob), 'dd/MM/yyyy') : 'N/A';

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
                    <p><strong>{t('userProfile.riskScore')}:</strong> {profile.risk_score}/100</p>
                    <p className="text-sm text-muted-foreground">{t('userProfile.riskReason', { status: statusInfo.text.toLowerCase() })}</p>
                  </TooltipContent>
                </Tooltip>
                {ageTags.map((tag, index) => (
                  <Badge key={index} className={cn(tag.className)}>{tag.text}</Badge>
                ))}
              </div>
              <CardDescription>{t('userProfile.personalProfileTitle')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('userProfile.contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('userProfile.email')}:</strong> {profile.email || 'N/A'}</p>
            <p><strong>{t('userProfile.phone')}:</strong> {profile.phone || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('userProfile.address')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {decryptedAddress ? (
              <>
                <p>{decryptedAddress.street}</p>
                <p>{decryptedAddress.city}, {decryptedAddress.province} {decryptedAddress.postalCode}</p>
                <p>{decryptedAddress.country}</p>
              </>
            ) : (
              <p>{profile.address ? t('userProfile.addressLocked') : t('userProfile.addressNotProvided')}</p>
            )}
          </CardContent>
        </Card>
        
        <UserAccounts cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} className="md:col-span-2" profileId={profileId} />

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('userProfile.identityInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('userProfile.dob')}:</strong> {formattedDob}</p>
            <p><strong>{t('userProfile.sin')}:</strong> {decryptedSin || (profile.sin ? t('userProfile.sinLocked') : t('userProfile.sinNotProvided'))}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalProfile;