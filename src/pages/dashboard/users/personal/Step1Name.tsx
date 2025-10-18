import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step1Name = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [fullName, setFullName] = useState(userData.fullName || '');
  const { t } = useTranslation('dashboard');

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser({ fullName });
    navigate('/dashboard/users/new/personal/step-2');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="fullName">{t('personalSteps.fullName')}</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-4 mt-8">
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step1Name;