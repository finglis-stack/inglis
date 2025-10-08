import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';

const Step5Review = () => {
  const navigate = useNavigate();
  const { userData, resetUser } = useNewUser();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    setLoading(true);

    if (consent && userData.sin) {
      // ... (logique du bureau de crédit reste la même)
    }

    const profileData = {
      full_name: userData.fullName,
      address: userData.address,
      phone: userData.phone,
      email: userData.email,
      dob: userData.dob,
      pin: userData.pin,
      sin: userData.sin || null,
    };

    try {
      const { error } = await supabase.functions.invoke('create-personal-profile', {
        body: profileData,
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }

      showSuccess('Nouvel utilisateur personnel créé avec succès !');
      resetUser();
      navigate('/dashboard/users');
    } catch (error) {
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formattedDob = userData.dob ? format(parseISO(userData.dob), 'dd/MM/yyyy') : 'N/A';

  return (
    <div>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">{t('dashboard.personalSteps.fullName')}</h4>
          <p className="text-muted-foreground">{userData.fullName}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.personalSteps.address')}</h4>
          <p className="text-muted-foreground">{userData.address?.street}, {userData.address?.city}, {userData.address?.province}, {userData.address?.postalCode}, {userData.address?.country}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.personalSteps.contact')}</h4>
          <p className="text-muted-foreground">{t('dashboard.personalSteps.phone')}: {userData.phone}</p>
          <p className="text-muted-foreground">{t('dashboard.personalSteps.email')}: {userData.email}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('dashboard.personalSteps.identity')}</h4>
          <p className="text-muted-foreground">{t('dashboard.personalSteps.dob')}: {formattedDob}</p>
          <p className="text-muted-foreground">{t('dashboard.personalSteps.sinValue')}: {userData.sin ? '***-***-***' : t('dashboard.personalSteps.sinNotProvided')}</p>
        </div>
         <div>
          <h4 className="font-semibold">{t('dashboard.personalSteps.pin')}</h4>
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
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-4')} disabled={loading}>{t('dashboard.sharedSteps.previous')}</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? t('dashboard.personalSteps.submitting') : t('dashboard.personalSteps.submit')}
        </Button>
      </div>
    </div>
  );
};

export default Step5Review;