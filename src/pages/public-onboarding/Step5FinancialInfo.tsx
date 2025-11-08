import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

const Step5FinancialInfo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formData, updateData } = usePublicOnboarding();
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [localData, setLocalData] = useState({
    employmentStatus: formData.employmentStatus || '',
    employer: formData.employer || '',
    annualIncome: formData.annualIncome || '',
    hasT4: formData.hasT4 || false,
    t4Income: formData.t4Income || '',
  });

  useEffect(() => {
    const fetchProgramDetails = async () => {
      if (formData.selectedProgramId) {
        const { data, error } = await supabase
          .from('card_programs')
          .select('min_income_requirement, min_credit_score_requirement')
          .eq('id', formData.selectedProgramId)
          .single();
        if (!error) setSelectedProgram(data);
      }
    };
    fetchProgramDetails();
  }, [formData.selectedProgramId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalData({ ...localData, [e.target.id]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setLocalData({ ...localData, employmentStatus: value });
  };

  const handleCheckboxChange = (checked: boolean) => {
    setLocalData({ ...localData, hasT4: checked });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData(localData);
    navigate('../step-6');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">{t('financial_info.title')}</h2>
      <p className="text-muted-foreground mt-1">{t('financial_info.subtitle')}</p>

      {selectedProgram && (selectedProgram.min_income_requirement || selectedProgram.min_credit_score_requirement) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('financial_info.requirements_title')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1">
              {selectedProgram.min_income_requirement && <li>{t('financial_info.min_income', { amount: new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(selectedProgram.min_income_requirement) })}</li>}
              {selectedProgram.min_credit_score_requirement && <li>{t('financial_info.min_score', { score: selectedProgram.min_credit_score_requirement })}</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 pt-4">
        <div className="grid gap-2">
          <Label htmlFor="employmentStatus">{t('financial_info.employment_status')}</Label>
          <Select onValueChange={handleSelectChange} value={localData.employmentStatus}>
            <SelectTrigger><SelectValue placeholder={t('financial_info.select_status')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">{t('financial_info.status.employed')}</SelectItem>
              <SelectItem value="self_employed">{t('financial_info.status.self_employed')}</SelectItem>
              <SelectItem value="student">{t('financial_info.status.student')}</SelectItem>
              <SelectItem value="retired">{t('financial_info.status.retired')}</SelectItem>
              <SelectItem value="unemployed">{t('financial_info.status.unemployed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(localData.employmentStatus === 'employed' || localData.employmentStatus === 'self_employed') && (
          <div className="grid gap-2">
            <Label htmlFor="employer">{t('financial_info.employer')}</Label>
            <Input id="employer" value={localData.employer} onChange={handleChange} />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="annualIncome">{t('financial_info.annual_income')}</Label>
          <Input id="annualIncome" type="number" value={localData.annualIncome} onChange={handleChange} required />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="hasT4" checked={localData.hasT4} onCheckedChange={handleCheckboxChange} />
          <Label htmlFor="hasT4">{t('financial_info.has_t4')}</Label>
        </div>
        {localData.hasT4 && (
          <div className="grid gap-2 pl-6">
            <Label htmlFor="t4Income">{t('financial_info.t4_income')}</Label>
            <Input id="t4Income" type="number" value={localData.t4Income} onChange={handleChange} />
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-4')}>{t('financial_info.previous_button')}</Button>
        <Button type="submit">{t('financial_info.next_button')}</Button>
      </div>
    </form>
  );
};

export default Step5FinancialInfo;