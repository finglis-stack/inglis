import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { showError } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

const InstitutionType = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [institutionType, setInstitutionType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setInstitutionType(data.institutionType || '');
      setJurisdiction(data.jurisdiction || '');
      setCountry((data.country || '').toLowerCase());
    } else {
        navigate('/onboarding/institution-info');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionType || !jurisdiction) {
        showError(t('institutionType.fillAllFieldsError'));
        return;
    }

    const savedData = localStorage.getItem('onboardingData');
    const data = savedData ? JSON.parse(savedData) : {};
    
    const updatedData = { ...data, institutionType, jurisdiction };
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
    
    navigate('/onboarding/contact-info');
  };

  const getJurisdictionOptions = () => {
    const countryNormalized = (country || '').trim().toLowerCase();

    if (['canada', 'ca'].includes(countryNormalized)) {
      return [
        { value: 'federal', label: t('institutionType.jurisdictionFederal') },
        { value: 'provincial', label: t('institutionType.jurisdictionProvincial') }
      ];
    }

    if (['united states', 'us', 'usa', 'united states of america'].includes(countryNormalized)) {
      return [
        { value: 'federal', label: t('institutionType.jurisdictionFederal') },
        { value: 'state', label: t('institutionType.jurisdictionState') }
      ];
    }

    // Default to Europe options for all other countries
    return [
      { value: 'national', label: t('institutionType.jurisdictionNational') },
      { value: 'european_union', label: t('institutionType.jurisdictionEU') }
    ];
  };

  const jurisdictionOptions = getJurisdictionOptions();

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">{t('institutionType.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('institutionType.subtitle')}</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>{t('institutionType.institutionTypeLabel')}</Label>
            <Select onValueChange={setInstitutionType} value={institutionType}>
                <SelectTrigger>
                    <SelectValue placeholder={t('institutionType.institutionTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="banque">{t('institutionType.typeBank')}</SelectItem>
                    <SelectItem value="cooperative_credit">{t('institutionType.typeCreditUnion')}</SelectItem>
                    <SelectItem value="fintech">{t('institutionType.typeFintech')}</SelectItem>
                    <SelectItem value="autre">{t('institutionType.typeOther')}</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('institutionType.jurisdictionLabel')}</Label>
            <RadioGroup onValueChange={setJurisdiction} value={jurisdiction} className="flex flex-wrap gap-4">
              {jurisdictionOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex justify-between mt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/onboarding/institution-info')}>
                {t('previous', { ns: 'common' })}
            </Button>
            <Button type="submit">
                {t('next', { ns: 'common' })}
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default InstitutionType;