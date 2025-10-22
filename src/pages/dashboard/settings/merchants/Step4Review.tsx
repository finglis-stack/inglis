import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewMerchant } from '@/context/NewMerchantContext';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const Step4Review = () => {
  const navigate = useNavigate();
  const { merchantData, resetMerchant } = useNewMerchant();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('dashboard');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (institutionError) throw institutionError;

      const { error: insertError } = await supabase.from('merchant_accounts').insert({
        institution_id: institution.id,
        name: merchantData.name,
        business_number: merchantData.business_number,
        jurisdiction: merchantData.jurisdiction,
        address: merchantData.address,
      });

      if (insertError) throw insertError;

      showSuccess(t('merchants.new.success'));
      resetMerchant();
      navigate('/dashboard/settings/merchants');
    } catch (error) {
      showError(`Erreur lors de la création du marchand : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">{t('merchants.new.nameLabel')}</h4>
          <p className="text-muted-foreground">{merchantData.name}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('corporateSteps.registration')}</h4>
          <p className="text-muted-foreground">{t('corporateSteps.businessNumber')}: {merchantData.business_number || 'N/A'}</p>
          <p className="text-muted-foreground">{t('corporateSteps.jurisdiction')}: {merchantData.jurisdiction || 'N/A'}</p>
        </div>
        <div>
          <h4 className="font-semibold">{t('corporateSteps.address')}</h4>
          <p className="text-muted-foreground">{merchantData.address?.street}, {merchantData.address?.city}, {merchantData.address?.province}, {merchantData.address?.postalCode}, {merchantData.address?.country}</p>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-3')} disabled={loading}>{t('sharedSteps.previous')}</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? t('merchants.new.creating') : t('merchants.addMerchant')}
        </Button>
      </div>
    </div>
  );
};

export default Step4Review;