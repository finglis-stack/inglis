import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const Step2CardSelection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig, updateData, formData } = usePublicOnboarding();
  const [selectedProgramId, setSelectedProgramId] = useState(formData.selectedProgramId || null);

  const handleSelect = (programId: string) => {
    setSelectedProgramId(programId);
  };

  const handleNext = () => {
    if (selectedProgramId) {
      updateData({ selectedProgramId });
      navigate('../step-3');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">{t('card_selection.title')}</h2>
      <p className="text-muted-foreground mt-1">{t('card_selection.subtitle')}</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {formConfig.cardPrograms.map((program: any) => (
          <div 
            key={program.id} 
            className="space-y-3"
          >
            <div 
              className={cn(
                "relative rounded-xl cursor-pointer border-2 transition-all",
                selectedProgramId === program.id ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-gray-300"
              )}
              onClick={() => handleSelect(program.id)}
            >
              <CardPreview
                programName={program.program_name}
                cardType={program.card_type}
                cardColor={program.card_color}
                cardImageUrl={program.card_image_url}
                showCardNumber={false}
                overlayCardNumber={false}
                imageOnly
              />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">{program.program_name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{program.card_type}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('..')}>{t('card_selection.previous_button')}</Button>
        <Button onClick={handleNext} disabled={!selectedProgramId}>{t('card_selection.next_button')}</Button>
      </div>
    </div>
  );
};

export default Step2CardSelection;