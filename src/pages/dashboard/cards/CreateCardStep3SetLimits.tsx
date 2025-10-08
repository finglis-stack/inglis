import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewCard } from '@/context/NewCardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { calculateAge } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

const CreateCardStep3SetLimits = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cardData, updateCard } = useNewCard();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [isBlockedMinor, setIsBlockedMinor] = useState(false);
  const [creditLimit, setCreditLimit] = useState(cardData.creditLimit || '');
  const [cashAdvanceLimit, setCashAdvanceLimit] = useState(cardData.cashAdvanceLimit || '');

  useEffect(() => {
    if (!cardData.profileId || !cardData.programId) {
      navigate('/dashboard/cards/new');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, dob, is_emancipated')
        .eq('id', cardData.profileId)
        .single();

      const { data: programData, error: programError } = await supabase
        .from('card_programs')
        .select('id, card_type')
        .eq('id', cardData.programId)
        .single();

      if (profileError || programError) {
        showError('Erreur lors de la récupération des détails.');
        navigate('/dashboard/cards/new');
        return;
      }

      setProfile(profileData);
      setProgram(programData);

      if (programData.card_type === 'credit') {
        const age = calculateAge(profileData.dob);
        if (age !== null && age < 18 && !profileData.is_emancipated) {
          setIsBlockedMinor(true);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [cardData, navigate]);

  const handleNext = () => {
    if (program?.card_type === 'credit') {
      updateCard({ creditLimit, cashAdvanceLimit });
    }
    navigate('/dashboard/cards/new/step-4');
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (program?.card_type === 'debit') {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t('dashboard.newCard.debitNoLimits')}</p>
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('dashboard.sharedSteps.previous')}</Button>
          <Button onClick={handleNext}>{t('dashboard.sharedSteps.next')}</Button>
        </div>
      </div>
    );
  }

  if (isBlockedMinor) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('dashboard.newCard.minorBlockedTitle')}</AlertTitle>
          <AlertDescription>{t('dashboard.newCard.minorBlockedDesc')}</AlertDescription>
        </Alert>
        <div className="flex justify-start mt-8">
          <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('dashboard.sharedSteps.previous')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="creditLimit">{t('dashboard.newCard.creditLimit')}</Label>
          <Input id="creditLimit" type="number" placeholder="5000.00" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cashAdvanceLimit">{t('dashboard.newCard.cashAdvanceLimit')}</Label>
          <Input id="cashAdvanceLimit" type="number" placeholder="500.00" value={cashAdvanceLimit} onChange={(e) => setCashAdvanceLimit(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('dashboard.sharedSteps.previous')}</Button>
        <Button onClick={handleNext} disabled={!creditLimit}>{t('dashboard.sharedSteps.next')}</Button>
      </div>
    </div>
  );
};

export default CreateCardStep3SetLimits;