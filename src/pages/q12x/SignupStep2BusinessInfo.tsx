import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Step2BusinessInfo = () => {
  const navigate = useNavigate();
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [formData, setFormData] = useState({
    business_number: onboardingData.business_number || '',
    jurisdiction: onboardingData.jurisdiction || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleJurisdictionChange = (value: string) => {
    setFormData({ ...formData, jurisdiction: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData(formData);
    navigate('/contact');
  };

  const businessTypes = [
    { value: 'entreprise_individuelle', label: 'Entreprise individuelle (travailleur autonome)' },
    { value: 'societe_par_actions', label: 'Société par actions (Inc.)' },
    { value: 'societe_en_nom_collectif', label: 'Société en nom collectif (S.E.N.C.)' },
    { value: 'societe_en_commandite', label: 'Société en commandite (S.E.C.)' },
    { value: 'cooperative', label: 'Coopérative' },
    { value: 'osbl', label: 'Organisme sans but lucratif (OSBL)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="business_number">Numéro d'entreprise du Québec (NEQ)</Label>
        <Input id="business_number" value={formData.business_number} onChange={handleChange} placeholder="Ex: 1234567890" />
        <p className="text-sm text-muted-foreground">
          Le NEQ est un identifiant de 10 chiffres attribué lors de l'immatriculation au registre des entreprises.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jurisdiction">Forme juridique de l'entreprise</Label>
        <Select onValueChange={handleJurisdictionChange} value={formData.jurisdiction}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une forme juridique" />
          </SelectTrigger>
          <SelectContent>
            {businessTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/')}>Précédent</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step2BusinessInfo;