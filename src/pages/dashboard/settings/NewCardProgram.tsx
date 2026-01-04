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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CardImageUploader from '@/components/dashboard/cards/CardImageUploader';

interface FormData {
  programName: string;
  programId: string;
  cardType: 'credit' | 'debit';
  currency: 'CAD' | 'USD';
  gracePeriod: string;
  default_interest_rate: string;
  min_interest_rate: string;
  max_interest_rate: string;
  default_cash_advance_rate: string;
  min_cash_advance_rate: string;
  max_cash_advance_rate: string;
  min_income_requirement: string;
  min_credit_score_requirement: string;
  feeModel: 'none' | 'annual_user' | 'per_transaction_user' | 'custom';
  issuanceFee: string;
  merchantTransactionFee: string;
  binType: 'dedicated' | 'shared';
  cardColor: string;
  cardImageUrl?: string;
}

const NewCardProgram = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    programName: '',
    programId: '',
    cardType: 'credit',
    currency: 'CAD',
    gracePeriod: '21',
    default_interest_rate: '19.99',
    min_interest_rate: '12.99',
    max_interest_rate: '24.99',
    default_cash_advance_rate: '22.99',
    min_cash_advance_rate: '14.99',
    max_cash_advance_rate: '29.99',
    min_income_requirement: '',
    min_credit_score_requirement: '',
    feeModel: 'none',
    issuanceFee: '',
    merchantTransactionFee: '',
    binType: 'shared',
    cardColor: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)',
    cardImageUrl: '',
  });

  const steps = [
    { id: 1, name: t('newCardProgram.step1_title') },
    { id: 2, name: t('newCardProgram.step2_title') },
    { id: 3, name: t('newCardProgram.step3_title_fees') },
    { id: 4, name: t('newCardProgram.step4_title_bin') },
    { id: 5, name: t('newCardProgram.step5_title_design') },
    { id: 6, name: t('newCardProgram.step6_title_review') },
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

  const handleSelectChange = (key: keyof FormData, value: any) => {
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
        currency: formData.currency,
        grace_period: formData.cardType === 'credit' ? parseInt(formData.gracePeriod) : null,
        default_interest_rate: formData.cardType === 'credit' ? parseFloat(formData.default_interest_rate) : null,
        min_interest_rate: formData.cardType === 'credit' ? parseFloat(formData.min_interest_rate) : null,
        max_interest_rate: formData.cardType === 'credit' ? parseFloat(formData.max_interest_rate) : null,
        default_cash_advance_rate: formData.cardType === 'credit' ? parseFloat(formData.default_cash_advance_rate) : null,
        min_cash_advance_rate: formData.cardType === 'credit' ? parseFloat(formData.min_cash_advance_rate) : null,
        max_cash_advance_rate: formData.cardType === 'credit' ? parseFloat(formData.max_cash_advance_rate) : null,
        min_income_requirement: formData.cardType === 'credit' && formData.min_income_requirement ? parseFloat(formData.min_income_requirement) : null,
        min_credit_score_requirement: formData.cardType === 'credit' && formData.min_credit_score_requirement ? parseInt(formData.min_credit_score_requirement) : null,
        fee_model: formData.feeModel,
        issuance_fee: formData.issuanceFee ? parseFloat(formData.issuanceFee) : null,
        merchant_transaction_fee: formData.merchantTransactionFee ? parseFloat(formData.merchantTransactionFee) : null,
        bin_type: formData.binType,
        bin: bin,
        card_color: formData.cardColor,
        card_image_url: formData.cardImageUrl || null,
      };

      const { error: insertError } = await supabase.from('card_programs').insert(programData);
      if (insertError) throw insertError;

      showSuccess(t('newCardProgram.successMessage'));
      navigate('/dashboard/settings/card-programs');

    } catch (error: any) {
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
      case 'none': return t('newCardProgram.feeNone');
      case 'annual_user': return t('newCardProgram.feeAnnual');
      case 'per_transaction_user': return t('newCardProgram.feePerTransactionUser');
      case 'custom': return t('newCardProgram.feeCustom');
      default: return 'N/A';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('newCardProgram.formTitle')}</CardTitle>
          <CardDescription>{t('newCardProgram.formDesc')}</CardDescription>
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
              <h3 className="text-lg font-semibold">{t('newCardProgram.step1_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step1_desc')}</p>
              <div className="grid gap-2">
                <Label htmlFor="programName">{t('newCardProgram.programNameLabel')}</Label>
                <Input id="programName" value={formData.programName} onChange={handleChange} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="programId">{t('newCardProgram.programIdLabel')}</Label>
                <Input id="programId" value={formData.programId} onChange={handleChange} required />
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('newCardProgram.step2_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step2_desc')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type de carte</Label>
                  <RadioGroup value={formData.cardType} onValueChange={(value) => handleRadioChange('cardType', value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="debit" id="debit" />
                      <Label htmlFor="debit">{t('newCardProgram.debit')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit" id="credit" />
                      <Label htmlFor="credit">{t('newCardProgram.credit')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid gap-2">
                  <Label>Devise</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleSelectChange('currency', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">CAD (Dollar Canadien)</SelectItem>
                      <SelectItem value="USD">USD (Dollar Américain)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.cardType === 'credit' && (
                <div className="space-y-6 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gracePeriod">{t('newCardProgram.gracePeriodLabel')}</Label>
                    <Input id="gracePeriod" type="number" value={formData.gracePeriod} onChange={handleChange} />
                  </div>
                  <Separator />
                  <div>
                    <Label>Taux d'intérêt sur les achats (%)</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="grid gap-1"><Label htmlFor="min_interest_rate" className="text-xs text-muted-foreground">Min.</Label><Input id="min_interest_rate" type="number" step="0.01" value={formData.min_interest_rate} onChange={handleChange} /></div>
                      <div className="grid gap-1"><Label htmlFor="default_interest_rate" className="text-xs text-muted-foreground">Défaut</Label><Input id="default_interest_rate" type="number" step="0.01" value={formData.default_interest_rate} onChange={handleChange} /></div>
                      <div className="grid gap-1"><Label htmlFor="max_interest_rate" className="text-xs text-muted-foreground">Max.</Label><Input id="max_interest_rate" type="number" step="0.01" value={formData.max_interest_rate} onChange={handleChange} /></div>
                    </div>
                  </div>
                  <div>
                    <Label>Taux d'intérêt sur les avances de fonds (%)</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="grid gap-1"><Label htmlFor="min_cash_advance_rate" className="text-xs text-muted-foreground">Min.</Label><Input id="min_cash_advance_rate" type="number" step="0.01" value={formData.min_cash_advance_rate} onChange={handleChange} /></div>
                      <div className="grid gap-1"><Label htmlFor="default_cash_advance_rate" className="text-xs text-muted-foreground">Défaut</Label><Input id="default_cash_advance_rate" type="number" step="0.01" value={formData.default_cash_advance_rate} onChange={handleChange} /></div>
                      <div className="grid gap-1"><Label htmlFor="max_cash_advance_rate" className="text-xs text-muted-foreground">Max.</Label><Input id="max_cash_advance_rate" type="number" step="0.01" value={formData.max_cash_advance_rate} onChange={handleChange} /></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label>Exigences d'admissibilité</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="grid gap-1">
                        <Label htmlFor="min_income_requirement" className="text-xs text-muted-foreground">Revenu minimum requis</Label>
                        <Input id="min_income_requirement" type="number" placeholder="35000" value={formData.min_income_requirement} onChange={handleChange} />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="min_credit_score_requirement" className="text-xs text-muted-foreground">Score de crédit minimum</Label>
                        <Input id="min_credit_score_requirement" type="number" placeholder="650" value={formData.min_credit_score_requirement} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('newCardProgram.step3_title_fees')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step3_desc_fees')}</p>
              <RadioGroup value={formData.feeModel} onValueChange={(value) => handleRadioChange('feeModel', value)} className="space-y-2">
                <Label htmlFor="fee-none" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="fee-none" /><span className="font-semibold">{t('newCardProgram.feeNone')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.feeNoneDesc')}</p>
                </Label>
                <Label htmlFor="fee-annual" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="annual_user" id="fee-annual" /><span className="font-semibold">{t('newCardProgram.feeAnnual')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.feeAnnualDesc')}</p>
                </Label>
                <Label htmlFor="fee-per-transaction-user" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="per_transaction_user" id="fee-per-transaction-user" /><span className="font-semibold">{t('newCardProgram.feePerTransactionUser')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.feePerTransactionUserDesc')}</p>
                </Label>
                <Label htmlFor="fee-custom" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id="fee-custom" /><span className="font-semibold">{t('newCardProgram.feeCustom')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.feeCustomDesc')}</p>
                </Label>
              </RadioGroup>
              {formData.feeModel === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-4">
                  <div className="grid gap-2"><Label htmlFor="issuanceFee">{t('newCardProgram.issuanceFeeLabel')}</Label><Input id="issuanceFee" type="number" placeholder="10.00" value={formData.issuanceFee} onChange={handleChange} /></div>
                  <div className="grid gap-2"><Label htmlFor="merchantTransactionFee">{t('newCardProgram.merchantFeeLabel')}</Label><Input id="merchantTransactionFee" type="number" placeholder="1.5" value={formData.merchantTransactionFee} onChange={handleChange} /></div>
                </div>
              )}
            </div>
          )}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('newCardProgram.step4_title_bin')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step4_desc_bin')}</p>
              <RadioGroup value={formData.binType} onValueChange={(value) => handleRadioChange('binType', value)} className="space-y-2">
                <Label htmlFor="shared-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="shared" id="shared-bin" /><span className="font-semibold">{t('newCardProgram.binShared')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.binSharedDesc')}</p>
                </Label>
                <Label htmlFor="dedicated-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="dedicated" id="dedicated-bin" /><span className="font-semibold">{t('newCardProgram.binDedicated')}</span></div>
                  <p className="text-sm text-muted-foreground ml-6">{t('newCardProgram.binDedicatedDesc')}</p>
                </Label>
              </RadioGroup>
            </div>
          )}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('newCardProgram.step5_title_design')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step5_desc_design')}</p>

              <CardImageUploader
                value={formData.cardImageUrl}
                onChange={(url) => setFormData(prev => ({ ...prev, cardImageUrl: url }))}
                recommendedWidth={1200}
                recommendedHeight={756}
                className="mb-4"
              />

              <p className="text-xs text-muted-foreground">Optionnel: choisissez un dégradé de couleur si vous n’utilisez pas d’image.</p>
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
              <h3 className="text-lg font-semibold">{t('newCardProgram.step6_title_review')}</h3>
              <p className="text-sm text-muted-foreground">{t('newCardProgram.step6_desc_review')}</p>
              <div className="p-4 border rounded-md space-y-2 mb-4">
                <p><strong>{t('newCardProgram.programNameLabel')}:</strong> {formData.programName}</p>
                <p><strong>{t('newCardProgram.programIdLabel')}:</strong> {formData.programId}</p>
                <p><strong>{t('newCardProgram.cardTypeLabel')}:</strong> {formData.cardType === 'credit' ? t('newCardProgram.credit') : t('newCardProgram.debit')}</p>
                <p><strong>Devise:</strong> {formData.currency}</p>
                {formData.cardType === 'credit' && <p><strong>{t('newCardProgram.gracePeriodLabel')}:</strong> {formData.gracePeriod} jours</p>}
                <p><strong>{t('newCardProgram.reviewFeeModel')}:</strong> {getFeeModelDescription()}</p>
                {formData.feeModel === 'custom' && (<>
                  <p><strong>{t('newCardProgram.issuanceFeeLabel')}:</strong> {formData.issuanceFee || '0.00'} CAD</p>
                  <p><strong>{t('newCardProgram.merchantFeeLabel')}:</strong> {formData.merchantTransactionFee || '0.0'}%</p>
                </>)}
                <p><strong>{t('newCardProgram.binTypeLabel')}:</strong> {formData.binType === 'dedicated' ? t('newCardProgram.binDedicated') : t('newCardProgram.binShared')}</p>
                <p><strong>Image:</strong> {formData.cardImageUrl ? 'Personnalisée' : 'Non définie'}</p>
              </div>
              <Card>
                <CardHeader><CardTitle>{t('newCardProgram.termsTitle')}</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 p-4 border rounded-md">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t('newCardProgram.termsContent')}</p>
                  </ScrollArea>
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox id="terms" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
                    <Label htmlFor="terms">{t('newCardProgram.termsCheckbox')}</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || loading}>{t('previous', { ns: 'common' })}</Button>
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={currentStep === 1 && (!formData.programName || !formData.programId)}>{t('next', { ns: 'common' })}</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!consent || loading}>
                {loading ? t('newCardProgram.creatingButton') : t('newCardProgram.finishButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="lg:col-span-1">
        <CardPreview
          programName={formData.programName || 'Programme'}
          cardType={formData.cardType}
          cardColor={formData.cardColor}
          cardImageUrl={formData.cardImageUrl}
        />
      </div>
    </div>
  );
};

export default NewCardProgram;