import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewCard } from '@/context/NewCardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const Step2SelectProgram = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { updateCard } = useNewCard();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_programs')
        .select('*')
        .eq('status', 'active');

      if (error) {
        showError(`Erreur: ${error.message}`);
      } else {
        setPrograms(data);
      }
      setLoading(false);
    };
    fetchPrograms();
  }, []);

  const handleNext = () => {
    if (selectedProgramId) {
      updateCard({ programId: selectedProgramId });
      navigate('/dashboard/cards/new/step-3');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : programs.length > 0 ? (
          programs.map((program) => (
            <Card
              key={program.id}
              onClick={() => setSelectedProgramId(program.id)}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedProgramId === program.id ? 'border-primary ring-2 ring-primary' : ''
              )}
            >
              <CardContent className="p-4">
                <h3 className="font-semibold">{program.program_name}</h3>
                <p className="text-sm text-muted-foreground">{program.program_id}</p>
                <p className="text-sm capitalize">{program.card_type}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>{t('cardPrograms.noPrograms')}</p>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('/dashboard/cards/new')}>{t('sharedSteps.previous')}</Button>
        <Button onClick={handleNext} disabled={!selectedProgramId}>{t('sharedSteps.next')}</Button>
      </div>
    </div>
  );
};

export default Step2SelectProgram;