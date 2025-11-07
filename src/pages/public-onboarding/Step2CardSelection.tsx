import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';

const Step2CardSelection = () => {
  const navigate = useNavigate();
  const { formConfig, updateData } = usePublicOnboarding();

  // This is a placeholder. I will implement the full logic later.
  const handleSelect = (programId: string) => {
    updateData({ selectedProgramId: programId });
    navigate('../step-3');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">Sélectionnez votre carte</h2>
      <p className="text-muted-foreground mt-1">Choisissez le produit qui vous convient le mieux.</p>
      <div className="mt-6 space-y-4">
        {formConfig.cardPrograms.map((program: any) => (
          <div key={program.id} className="p-4 border rounded-md cursor-pointer hover:border-primary" onClick={() => handleSelect(program.id)}>
            <p className="font-semibold">{program.program_name}</p>
            <p className="text-sm text-muted-foreground capitalize">{program.card_type}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('..')}>Précédent</Button>
      </div>
    </div>
  );
};

export default Step2CardSelection;