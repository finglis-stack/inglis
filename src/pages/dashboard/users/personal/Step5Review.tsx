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
  const { t } = useTranslation('dashboard');

  const handleSubmit = async () => {
    setLoading(true);

    const profileData = {
      ...userData,
      consent: consent,
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
    } catch (err) {
      if (err instanceof Error) {
        showError(`Erreur lors de la création de l'utilisateur : ${err.message}`);
      } else {
        showError("Une erreur inconnue est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formattedDob = userData.dob ? format(parseISO(userData.dob), 'dd/MM/yyyy') : 'N/A';

  return (
    <div>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">{t('personalSteps.fullName')}</h4>
          <p className="text-muted-foreground">{userData.fullName}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('personalSteps.address')}</h4>
          <p className="text-muted-foreground">{userData.address?.street}, {userData.address?.city}, {userData.address?.province}, {userData.address?.postalCode}, {userData.address?.country}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('personalSteps.contact')}</h4>
          <p className="text-muted-foreground">{t('personalSteps.phone')}: {userData.phone}</p>
          <p className="text-muted-foreground">{t('personalSteps.email')}: {userData.email}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('personalSteps.identity')}</h4>
          <p className="text-muted-foreground">{t('personalSteps.dob')}: {formattedDob}</p>
          <p className="text-muted-foreground">{t('personalSteps.sinValue')}: {userData.sin ? '***-***-***' : t('personalSteps.sinNotProvided')}</p>
        </div>
         <div>
          <h4 className="font-semibold">{t('personalSteps.pin')}</h4>
          <p className="text-muted-foreground">****</p>
        </div>
        <div className="items-top flex space-x-2 pt-4">
          <Checkbox id="terms1" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
          <div className="grid gap-1.5 leading-none">
            <Label htmlFor="terms1" className="font-bold">
              {t('personalSteps.consentTitle')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('personalSteps.consentDesc')}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-4')} disabled={loading}>{t('sharedSteps.previous')}</Button>
        <Button onClick={handleSubmit} disabled={loading || (userData.sin && !consent)}>
          {loading ? t('personalSteps.submitting') : t('personalSteps.submit')}
        </Button>
      </div>
    </div>
  );
};

export default Step5Review;