import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const Step1BusinessInfo = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    legalName: userData.legalName || '',
    operatingName: userData.operatingName || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/corporate/step-2');
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{t('dashboard.corporateSteps.step1_title')}</CardTitle>
        <CardDescription>{t('dashboard.corporateSteps.step1_desc')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="legalName">{t('dashboard.corporateSteps.legalName')}</Label>
            <Input id="legalName" required value={formData.legalName} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operatingName">{t('dashboard.corporateSteps.operatingName')}</Label>
            <Input id="operatingName" value={formData.operatingName} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" asChild><Link to="/dashboard/users/new">{t('dashboard.sharedSteps.cancel')}</Link></Button>
          <Button type="submit">{t('dashboard.sharedSteps.next')}</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default Step1BusinessInfo;