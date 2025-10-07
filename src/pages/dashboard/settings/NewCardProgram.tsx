import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FormData {
  programName: string;
  programId: string;
  cardType: 'credit' | 'debit';
  gracePeriod: string;
  binType: 'dedicated' | 'shared';
  cardColor: string;
}

const NewCardProgram = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    programName: 'Programme Prestige',
    programId: 'P-001',
    cardType: 'credit',
    gracePeriod: '30',
    binType: 'shared',
    cardColor: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)',
  });

  const steps = [
    { id: 1, name: t('dashboard.newCardProgram.step1_title') },
    { id: 2, name: t('dashboard.newCardProgram.step2_title') },
    { id: 3, name: t('dashboard.newCardProgram.step3_title_bin') },
    { id: 4, name: t('dashboard.newCardProgram.step4_title_design') },
    { id: 5, name: t('dashboard.newCardProgram.step5_title_review') },
  ];

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const cardColors = [
    { name: 'Bleu Océan', value: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)' },
    { name: 'Noir de Jais', value: 'linear-gradient(to bottom right, #171717, #444444)' },
    { name: 'Or Rose', value: 'linear-gradient(to bottom right, #fde0cf, #f7a8a8)' },
    { name: 'Vert Forêt', value: 'linear-gradient(to bottom right, #14532d, #22c55e)' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.newCardProgram.title')}</h1>
        <Button variant="outline" asChild>
          <Link to="/dashboard/settings/card-programs">{t('dashboard.newCardProgram.cancel')}</Link>
        </Button>
      </div>

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
                  <div className="ml-4">
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
                  <Input id="programName" value={formData.programName} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="programId">{t('dashboard.newCardProgram.programIdLabel')}</Label>
                  <Input id="programId" value={formData.programId} onChange={handleChange} />
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step2_title')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step2_desc')}</p>
                <RadioGroup value={formData.cardType} onValueChange={(value) => setFormData({...formData, cardType: value as 'credit' | 'debit'})}>
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
                <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step3_title_bin')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step3_desc_bin')}</p>
                <RadioGroup value={formData.binType} onValueChange={(value) => setFormData({...formData, binType: value as 'dedicated' | 'shared'})} className="space-y-2">
                  <Label htmlFor="shared-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="shared" id="shared-bin" />
                      <span className="font-semibold">{t('dashboard.newCardProgram.binShared')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.binSharedDesc')}</p>
                  </Label>
                  <Label htmlFor="dedicated-bin" className="flex flex-col p-4 border rounded-md has-[[data-state=checked]]:border-primary cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dedicated" id="dedicated-bin" />
                      <span className="font-semibold">{t('dashboard.newCardProgram.binDedicated')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">{t('dashboard.newCardProgram.binDedicatedDesc')}</p>
                  </Label>
                </RadioGroup>
              </div>
            )}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step4_title_design')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step4_desc_design')}</p>
                <div className="grid grid-cols-2 gap-4">
                  {cardColors.map(color => (
                    <button key={color.name} onClick={() => setFormData({...formData, cardColor: color.value})} className={cn("p-4 rounded-md border-2", formData.cardColor === color.value ? "border-primary" : "border-transparent")}>
                      <div className="w-full h-16 rounded" style={{ background: color.value }} />
                      <p className="mt-2 text-sm font-medium">{color.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('dashboard.newCardProgram.step5_title_review')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.newCardProgram.step5_desc_review')}</p>
                <div className="p-4 border rounded-md space-y-2">
                  <p><strong>{t('dashboard.newCardProgram.programNameLabel')}:</strong> {formData.programName}</p>
                  <p><strong>{t('dashboard.newCardProgram.programIdLabel')}:</strong> {formData.programId}</p>
                  <p><strong>{t('dashboard.newCardProgram.cardTypeLabel')}:</strong> {formData.cardType === 'credit' ? t('dashboard.newCardProgram.credit') : t('dashboard.newCardProgram.debit')}</p>
                  {formData.cardType === 'credit' && <p><strong>{t('dashboard.newCardProgram.gracePeriodLabel')}:</strong> {formData.gracePeriod} jours</p>}
                  <p><strong>{t('dashboard.newCardProgram.binTypeLabel')}:</strong> {formData.binType === 'dedicated' ? t('dashboard.newCardProgram.binDedicated') : t('dashboard.newCardProgram.binShared')}</p>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>{t('dashboard.sharedSteps.previous')}</Button>
              {currentStep < steps.length ? (
                <Button onClick={handleNext}>{t('dashboard.sharedSteps.next')}</Button>
              ) : (
                <Button>{t('dashboard.newCardProgram.finishButton')}</Button>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-1">
          <CardPreview {...formData} />
        </div>
      </div>
    </div>
  );
};

export default NewCardProgram;