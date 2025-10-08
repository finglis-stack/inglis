import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface FormData {
  programName: string;
  programId: string;
  cardType: 'credit' | 'debit';
  gracePeriod: string;
  feeModel: 'none' | 'annual_user' | 'per_transaction_user' | 'custom';
  issuanceFee: string;
  merchantTransactionFee: string;
  binType: 'dedicated' | 'shared';
  cardColor: string;
}

const NewCardProgram = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    programName: '',
    programId: '',
    cardType: 'credit',
    gracePeriod: '30',
    feeModel: 'none',
    issuanceFee: '',
    merchantTransactionFee: '',
    binType: 'shared',
    cardColor: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)',
  });

  const steps = [
    { id: 1, name: t('dashboard.newCardProgram.step1_title') },
    { id: 2, name: t('dashboard.newCardProgram.step2_title') },
    { id: 3, name: t('dashboard.newCardProgram.step3_title_fees') },
    { id: 4, name: t('dashboard.newCardProgram.step4_title_bin') },
    { id: 5, name: t('dashboard.newCardProgram.step5_title_design') },
    { id: 6, name: t('dashboard.newCardProgram.step6_title_review') },
  ];

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRadioChange = (key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleColorChange = (value: string) => {
    setFormData(prev => ({ ...prev, cardColor: value }));
  };

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

      let bin;
      if (formData.binType === 'dedicated') {
        let isUnique = false;
        while (!isUnique) {
          bin = Math.floor(100000 + Math.random() * 900000).toString();
          const { data: existingBin, error: binCheckError } = await supabase
            .from('card_programs')
            .select('bin')
            .eq('bin', bin)
            .eq('bin_type', 'dedicated')
            .single();
          if (binCheckError && binCheckError.code !== 'PGRST116') throw binCheckError;
          if (!existingBin) isUnique = true;
        }
      } else {
        bin = '100000'; // BIN partagé par défaut
      }

      const programData = {
        institution_id: institution.id,
        program_name: formData.programName,
        program_id: formData.programId,
        card_type: formData.cardType,
        grace_period: formData.cardType === 'credit' ? parseInt(formData.gracePeriod) : null,
        fee_model: formData.feeModel,
        issuance_fee: formData.issuanceFee ? parseFloat(formData.issuanceFee) : null,
        merchant_transaction_fee: formData.merchantTransactionFee ? parseFloat(formData.merchantTransactionFee) : null,
        bin_type: formData.binType,
        bin: bin,
        card_color: formData.cardColor,
      };

      const { error: insertError } = await supabase.from('card_programs').insert(programData);
      if (insertError) throw insertError;

      showSuccess(t('dashboard.newCardProgram.successMessage'));
      navigate('/dashboard/settings/card-programs');

    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cardColors = [
    { name: 'Bleu Océan', value: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)' },
    { name: 'Noir de Jais', value: 'linear-gradient(to bottom right, #171717, #444444)' },
    { name: 'Or Rose', value: 'linear-gradient(to bottom right, #fde0cf, #f7a8a8)' },
    { name: 'Vert Forêt', value: 'linear-gradient(to bottom right, #14532d, #22c55e)' },
  ];

  const getFeeModelDescription = () => {
    switch (formData.feeModel) {
      case 'none': return t('dashboard.newCardProgram.feeNone');
      case 'annual_user': return t('dashboard.newCardProgram.feeAnnual');
      case 'per_transaction_user': return t('dashboard.newCardProgram.feePerTransactionUser');
      case 'custom': return t('dashboard.newCardProgram.feeCustom');
      default: return 'N/A';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('dashboard.newCardProgram.formTitle')}</CardTitle>
          <CardDescription>{t('dashboard.newCardProgram.formDesc')}</CardDescription>
          <div className="flex justify-between pt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center w-full">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full", currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {step.id}
                </div>
                <div className="ml-4 hidden md:block">
                  <h4 className="font-semibold">{step.name}</h4>
                </div>
                {index < steps.length - 1 && <div className="flex-grow h-px bg-border ml-4"></div>}
              </div>
            ))}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step1_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step1_desc')}</p>
              <div className="grid gap-2">
                <Label htmlFor="programName">{t('dashboard.newCardProgram.programNameLabel')}</Label>
                <Input id="programName" value={formData.programName} onChange={handleChange} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="programId">{t('dashboard.newCardProgram.programIdLabel')}</Label>
                <Input id="programId" value={formData.programId} onChange={handleChange} required />
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step2_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step2_desc')}</p>
              <RadioGroup value={formData.cardType} onValueChange={(value) => handleRadioChange('cardType', value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit" id="debit" />
                  <Label htmlFor="debit">{t('dashboard.newCardProgram.debit')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit">{t('dashboard.newCardProgram.credit')}</Label>
                </div>
              </RadioGroup>
              {formData.cardType === 'credit' && (
                <div className="grid gap-2 pt-4">
                  <Label htmlFor="gracePeriod">{t('dashboard.newCardProgram.gracePeriodLabel')}</Label>
                  <Input id="gracePeriod" type="number" value={formData.gracePeriod} onChange={handleChange} />
                </div>
              )}
            </div>
          )}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step3_title_fees')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step3_desc_fees')}</p>
              <RadioGroup value={formData.feeModel} onValueChange={(value) => handleRadioChange('feeModel', value)} className="space-y-2">
                <Label htmlFor="fee-none" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="fee-none" /><span className="font-semibold">{t('dashboard.newCardProgram.feeNone')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.feeNoneDesc')}</p>
                </Label>
                <Label htmlFor="fee-annual" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="annual_user" id="fee-annual" /><span className="font-semibold">{t('dashboard.newCardProgram.feeAnnual')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.feeAnnualDesc')}</p>
                </Label>
                <Label htmlFor="fee-per-transaction-user" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="per_transaction_user" id="fee-per-transaction-user" /><span className="font-semibold">{t('dashboard.newCardProgram.feePerTransactionUser')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.feePerTransactionUserDesc')}</p>
                </Label>
                <Label htmlFor="fee-custom" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id="fee-custom" /><span className="font-semibold">{t('dashboard.newCardProgram.feeCustom')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.feeCustomDesc')}</p>
                </Label>
              </RadioGroup>
              {formData.feeModel === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
                  <div className="grid gap-2"><Label htmlFor="issuanceFee">{t('dashboard.newCardProgram.issuanceFeeLabel')}</Label><Input id="issuanceFee" type="number" placeholder="10.00" value={formData.issuanceFee} onChange={handleChange} /></div>
                  <div className="grid gap-2"><Label htmlFor="merchantTransactionFee">{t('dashboard.newCardProgram.merchantFeeLabel')}</Label><Input id="merchantTransactionFee" type="number" placeholder="1.5" value={formData.merchantTransactionFee} onChange={handleChange} /></div>
                </div>
              )}
            </div>
          )}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step4_title_bin')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step4_desc_bin')}</p>
              <RadioGroup value={formData.binType} onValueChange={(value) => handleRadioChange('binType', value)} className="space-y-2">
                <Label htmlFor="shared-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="shared" id="shared-bin" /><span className="font-semibold">{t('dashboard.newCardProgram.binShared')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.binSharedDesc')}</p>
                </Label>
                <Label htmlFor="dedicated-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="dedicated" id="dedicated-bin" /><span className="font-semibold">{t('dashboard.newCardProgram.binDedicated')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.binDedicatedDesc')}</p>
                </Label>
              </RadioGroup>
            </div>
          )}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step5_title_design')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step5_desc_design')}</p>
              <div className="grid grid-cols-2 gap-4">
                {cardColors.map(color => (
                  <button key={color.name} onClick={() => handleColorChange(color.value)} className={cn("p-4 rounded-md border-2", formData.cardColor === color.value ? "border-primary" : "border-transparent")}>
                    <div className="w-full h-16 rounded" style={{ background: color.value }} />
                    <p className="mt-2 text-sm font-medium">{color.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step6_title_review')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step6_desc_review')}</p>
              <div className="p-4 border rounded-md space-y-2 mb-4">
                <p><strong>{t('dashboard.newCardProgram.programNameLabel')}:</strong> {formData.programName}</p>
                <p><strong>{t('dashboard.newCardProgram.programIdLabel')}:</strong> {formData.programId}</p>
                <p><strong>{t('dashboard.newCardProgram.cardTypeLabel')}:</strong> {formData.cardType === 'credit' ? t('dashboard.newCardProgram.credit') : t('dashboard.newCardProgram.debit')}</p>
                {formData.cardType === 'credit' && <p><strong>{t('dashboard.newCardProgram.gracePeriodLabel')}:</strong> {formData.gracePeriod} jours</p>}
                <p><strong>{t('dashboard.newCardProgram.reviewFeeModel')}:</strong> {getFeeModelDescription()}</p>
                {formData.feeModel === 'custom' && (<>
                  <p><strong>{t('dashboard.newCardProgram.issuanceFeeLabel')}:</strong> {formData.issuanceFee || '0.00'} CAD</p>
                  <p><strong>{t('dashboard.newCardProgram.merchantFeeLabel')}:</strong> {formData.merchantTransactionFee || '0.0'}%</p>
                </>)}
                <p><strong>{t('dashboard.newCardProgram.binTypeLabel')}:</strong> {formData.binType === 'dedicated' ? t('dashboard.newCardProgram.binDedicated') : t('dashboard.newCardProgram.binShared')}</p>
              </div>
              <Card>
                <CardHeader><CardTitle>{t('dashboard.newCardProgram.termsTitle')}</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 p-4 border rounded-md">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t('dashboard.newCardProgram.termsContent')}</p>
                  </ScrollArea>
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox id="terms" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
                    <Label htmlFor="terms">{t('dashboard.newCardProgram.termsCheckbox')}</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || loading}>{t('dashboard.sharedSteps.previous')}</Button>
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={currentStep === 1 && (!formData.programName || !formData.programId)}>{t('dashboard.sharedSteps.next')}</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!consent || loading}>
                {loading ? t('dashboard.newCardProgram.creatingButton') : t('dashboard.newCardProgram.finishButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="lg:col-span-1">
        <CardPreview {...formData} />
      </div>
    </div>
  );
};

export default NewCardProgram;