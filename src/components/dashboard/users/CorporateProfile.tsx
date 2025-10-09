import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import UserAccounts from './UserAccounts';

const CorporateProfile = ({ profile, cards, creditAccounts, debitAccounts, profileId }) => {
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
                    <p><strong>{t('dashboard.userProfile.riskScore')}:</strong> {profile.risk_score}/100</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.userProfile.riskReason', { status: statusInfo.text.toLowerCase() })}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>{t('dashboard.userProfile.corporateProfileTitle')} {profile.operating_name && `(${t('dashboard.userProfile.operatingAs')} ${profile.operating_name})`}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile.registrationInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('dashboard.userProfile.businessNumber')}:</strong> {profile.business_number || 'N/A'}</p>
            <p><strong>{t('dashboard.userProfile.jurisdiction')}:</strong> {profile.jurisdiction || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile.businessAddress')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>{profile.business_address?.street}</p>
            <p>{profile.business_address?.city}, {profile.business_address?.province} {profile.business_address?.postalCode}</p>
            <p>{profile.business_address?.country}</p>
          </CardContent>
        </Card>
        <UserAccounts cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} className="md:col-span-2" profileId={profileId} />
      </div>
    </div>
  );
};

export default CorporateProfile;