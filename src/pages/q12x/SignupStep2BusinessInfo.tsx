import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from 'react-i18next';

const Step2BusinessInfo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('q12x');
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [formData, setFormData] = useState({
    business_number: onboardingData.business_number || '',
    jurisdiction: onboardingData.jurisdiction || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleJurisdictionChange = (value: string) => {
    setFormData({ ...formData, jurisdiction: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData(formData);
    navigate('/contact');
  };

  const businessTypes = [
    { value: 'entreprise_individuelle', label: t('signup.step2.types.entreprise_individuelle') },
    { value: 'societe_par_actions', label: t('signup.step2.types.societe_par_actions') },
    { value: 'societe_en_nom_collectif', label: t('signup.step2.types.societe_en_nom_collectif') },
    { value: 'societe_en_commandite', label: t('signup.step2.types.societe_en_commandite') },
    { value: 'cooperative', label: t('signup.step2.types.cooperative') },
    { value: 'osbl', label: t('signup.step2.types.osbl') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="business_number">{t('signup.step2.neqLabel')}</Label>
        <Input id="business_number" value={formData.business_number} onChange={handleChange} placeholder="Ex: 1234567890" />
        <p className="text-sm text-muted-foreground">
          {t('signup.step2.neqDesc')}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jurisdiction">{t('signup.step2.legalFormLabel')}</Label>
        <Select onValueChange={handleJurisdictionChange} value={formData.jurisdiction}>
          <SelectTrigger>
            <SelectValue placeholder={t('signup.step2.legalFormPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/')}>{t('signup.step2.previous')}</Button>
        <Button type="submit">{t('signup.step2.next')}</Button>
      </div>
    </form>
  );
};

export default Step2BusinessInfo;