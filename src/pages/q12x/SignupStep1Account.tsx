import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { showError } from '@/utils/toast';
import { useTranslation, Trans } from 'react-i18next';

const Step1Account = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('q12x');
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [formData, setFormData] = useState({
    name: onboardingData.name || '',
    email: onboardingData.email || '',
    password: '',
  });
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      showError(t('signup.step1.termsError'));
      return;
    }
    updateData(formData);
    navigate('/business-info');
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('signup.step1.nameLabel')}</Label>
          <Input id="name" required value={formData.name} onChange={handleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t('signup.step1.emailLabel')}</Label>
          <Input id="email" type="email" required value={formData.email} onChange={handleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">{t('signup.step1.passwordLabel')}</Label>
          <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
          <Label htmlFor="terms" className="text-sm font-normal">
            <Trans
              i18nKey="signup.step1.terms"
              t={t}
              components={[
                <a href="#" className="underline" />,
                <a href="#" className="underline" />,
              ]}
            />
          </Label>
        </div>
        <Button type="submit" className="w-full">{t('signup.step1.next')}</Button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        {t('signup.step1.alreadyAccount')}{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          {t('signup.step1.signIn')}
        </Link>
      </p>
    </>
  );
};

export default Step1Account;