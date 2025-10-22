import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewCard } from '@/context/NewCardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step3ReviewCard = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { cardData, resetCard } = useNewCard();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);

  useEffect(() => {
    if (!cardData.profileId || !cardData.programId) {
      navigate('/dashboard/cards/new');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cardData.profileId)
        .single();

      const { data: programData, error: programError } = await supabase
        .from('card_programs')
        .select('*')
        .eq('id', cardData.programId)
        .single();

      if (profileError || programError) {
        showError('Erreur lors de la récupération des détails.');
        navigate('/dashboard/cards/new');
      } else {
        setProfile(profileData);
        setProgram(programData);
      }
      setLoading(false);
    };

    fetchData();
  }, [cardData, navigate]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-card', {
        body: {
          profile_id: cardData.profileId,
          card_program_id: cardData.programId,
        },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }

      showSuccess(t('newCard.successMessage'));
      resetCard();
      navigate('/dashboard/cards');
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <Card>
          <CardHeader><CardTitle>{t('newCard.reviewTitle')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">{t('newCard.user')}</h4>
              <p className="text-muted-foreground">{profile.type === 'personal' ? profile.full_name : profile.legal_name}</p>
            </div>
            <div>
              <h4 className="font-semibold">{t('newCard.program')}</h4>
              <p className="text-muted-foreground">{program.program_name}</p>
            </div>
            <div>
              <h4 className="font-semibold">{t('newCard.cardType')}</h4>
              <p className="text-muted-foreground capitalize">{program.card_type}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <CardPreview
          programName={program.program_name}
          cardType={program.card_type}
          cardColor={program.card_color}
        />
      </div>
      <div className="md:col-span-2 flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')} disabled={submitting}>
          {t('sharedSteps.previous')}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('newCard.creating') : t('newCard.createButton')}
        </Button>
      </div>
    </div>
  );
};

export default Step3ReviewCard;