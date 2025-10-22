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
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { cardData, updateCard } = useNewCard();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [isBlockedMinor, setIsBlockedMinor] = useState(false);
  const [creditLimit, setCreditLimit] = useState(cardData.creditLimit || '');
  const [cashAdvanceLimit, setCashAdvanceLimit] = useState(cardData.cashAdvanceLimit || '');
  const [interestRate, setInterestRate] = useState(cardData.interestRate || '');
  const [cashAdvanceRate, setCashAdvanceRate] = useState(cardData.cashAdvanceRate || '');

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
        .select('*')
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
        setInterestRate(cardData.interestRate || programData.default_interest_rate || '19.99');
        setCashAdvanceRate(cardData.cashAdvanceRate || programData.default_cash_advance_rate || '22.99');
        const age = calculateAge(profileData.dob);
        if (age !== null && age < 18 && !profileData.is_emancipated) {
          setIsBlockedMinor(true);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [cardData.profileId, cardData.programId, navigate]);

  const handleNext = () => {
    if (program?.card_type === 'credit') {
      updateCard({ creditLimit, cashAdvanceLimit, interestRate, cashAdvanceRate });
    }
    navigate('/dashboard/cards/new/step-4');
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (program?.card_type === 'debit') {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t('newCard.debitNoLimits')}</p>
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('sharedSteps.previous')}</Button>
          <Button onClick={handleNext}>{t('sharedSteps.next')}</Button>
        </div>
      </div>
    );
  }

  if (isBlockedMinor) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('newCard.minorBlockedTitle')}</AlertTitle>
          <AlertDescription>{t('newCard.minorBlockedDesc')}</AlertDescription>
        </Alert>
        <div className="flex justify-start mt-8">
          <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('sharedSteps.previous')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="creditLimit">{t('newCard.creditLimit')}</Label>
          <Input id="creditLimit" type="number" placeholder="5000.00" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cashAdvanceLimit">{t('newCard.cashAdvanceLimit')}</Label>
          <Input id="cashAdvanceLimit" type="number" placeholder="500.00" value={cashAdvanceLimit} onChange={(e) => setCashAdvanceLimit(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="interestRate">{t('newCard.interestRatePurchases')}</Label>
          <Input 
            id="interestRate" 
            type="number" 
            step="0.01" 
            placeholder="19.99" 
            value={interestRate} 
            onChange={(e) => setInterestRate(e.target.value)} 
            min={program?.min_interest_rate}
            max={program?.max_interest_rate}
            required 
          />
          {program?.min_interest_rate && program?.max_interest_rate && (
            <p className="text-xs text-muted-foreground">Entre {program.min_interest_rate}% et {program.max_interest_rate}%</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cashAdvanceRate">{t('newCard.interestRateCashAdvances')}</Label>
          <Input 
            id="cashAdvanceRate" 
            type="number" 
            step="0.01" 
            placeholder="22.99" 
            value={cashAdvanceRate} 
            onChange={(e) => setCashAdvanceRate(e.target.value)} 
            min={program?.min_cash_advance_rate}
            max={program?.max_cash_advance_rate}
            required 
          />
          {program?.min_cash_advance_rate && program?.max_cash_advance_rate && (
            <p className="text-xs text-muted-foreground">Entre {program.min_cash_advance_rate}% et {program.max_cash_advance_rate}%</p>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-2')}>{t('sharedSteps.previous')}</Button>
        <Button onClick={handleNext} disabled={!creditLimit || !interestRate || !cashAdvanceRate}>{t('sharedSteps.next')}</Button>
      </div>
    </div>
  );
};

export default CreateCardStep3SetLimits;