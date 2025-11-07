import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const Step2CardSelection = () => {
  const navigate = useNavigate();
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
      <h2 className="text-xl font-semibold">Sélectionnez votre carte</h2>
      <p className="text-muted-foreground mt-1">Choisissez le produit qui vous convient le mieux.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {formConfig.cardPrograms.map((program: any) => (
          <div 
            key={program.id} 
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
            />
            {selectedProgramId === program.id && (
              <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('..')}>Précédent</Button>
        <Button onClick={handleNext} disabled={!selectedProgramId}>Suivant</Button>
      </div>
    </div>
  );
};

export default Step2CardSelection;