import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from './OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { showError } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InstitutionType = () => {
  const navigate = useNavigate();
  const [institutionType, setInstitutionType] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/onboarding/create-account');
      }
    });

    const savedData = localStorage.getItem('onboardingData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setInstitutionType(data.institutionType || '');
      setJurisdiction(data.jurisdiction || '');
    } else {
        navigate('/onboarding/institution-info');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionType || !jurisdiction) {
        showError("Veuillez remplir tous les champs.");
        return;
    }

    const savedData = localStorage.getItem('onboardingData');
    const data = savedData ? JSON.parse(savedData) : {};
    
    const updatedData = { ...data, institutionType, jurisdiction };
    localStorage.setItem('onboardingData', JSON.stringify(updatedData));
    
    navigate('/onboarding/contact-info');
  };

  return (
    <OnboardingLayout>
      <h1 className="text-3xl font-bold mb-2">Détails de l'institution (2/3)</h1>
      <p className="text-muted-foreground mb-6">Quel type d'institution représentez-vous ?</p>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>Type d'institution</Label>
            <Select onValueChange={setInstitutionType} value={institutionType}>
                <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="banque">Banque</SelectItem>
                    <SelectItem value="cooperative_credit">Coopérative de crédit</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Juridiction</Label>
            <RadioGroup onValueChange={setJurisdiction} value={jurisdiction} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="federal" id="federal" />
                <Label htmlFor="federal">Fédéral</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="provincial" id="provincial" />
                <Label htmlFor="provincial">Provincial</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/onboarding/institution-info')}>
                Précédent
            </Button>
            <Button type="submit">
                Suivant
            </Button>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
};

export default InstitutionType;