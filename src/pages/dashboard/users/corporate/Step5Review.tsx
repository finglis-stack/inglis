import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const Step5Review = () => {
  const navigate = useNavigate();
  const { userData, resetUser } = useNewUser();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-corporate-profile', {
        body: userData,
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }

      showSuccess('Nouvel utilisateur corporatif créé avec succès !');
      resetUser();
      navigate('/dashboard/users');
    } catch (error) {
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">{t('dashboard.corporateSteps.companyName')}</h4>
          <p className="text-muted-foreground">{t('dashboard.corporateSteps.legal')}: {userData.legalName}</p>
          <p className="text-muted-foreground">{t('dashboard.corporateSteps.commercial')}: {userData.operatingName || 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.corporateSteps.registration')}</h4>
          <p className="text-muted-foreground">{t('dashboard.corporateSteps.businessNumber')}: {userData.businessNumber}</p>
          <p className="text-muted-foreground">{t('dashboard.corporateSteps.jurisdiction')}: {userData.jurisdiction}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.corporateSteps.address')}</h4>
          <p className="text-muted-foreground">{userData.businessAddress?.street}, {userData.businessAddress?.city}, {userData.businessAddress?.province}, {userData.businessAddress?.postalCode}, {userData.businessAddress?.country}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.corporateSteps.pin')}</h4>
          <p className="text-muted-foreground">****</p>
        </div>
        <div className="items-top flex space-x-2 pt-4">
          <Checkbox id="terms1" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="terms1" className="font-bold">
              {t('dashboard.personalSteps.consentTitle')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.personalSteps.consentDesc')}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/corporate/step-4')} disabled={loading}>{t('dashboard.sharedSteps.previous')}</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? t('dashboard.corporateSteps.submitting') : t('dashboard.corporateSteps.submit')}
        </Button>
      </div>
    </div>
  );
};

export default Step5Review;