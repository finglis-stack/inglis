import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const ApplyIdPrompt = () => {
  const [formId, setFormId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formId.trim()) {
      navigate(`/apply/${formId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tester un Formulaire d'Intégration</CardTitle>
          <CardDescription>
            Entrez l'ID du formulaire que vous avez généré dans le tableau de bord Inglis Dominion pour le visualiser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="formId">ID du Formulaire</Label>
              <Input 
                id="formId" 
                value={formId} 
                onChange={(e) => setFormId(e.target.value)} 
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </div>
            <Button type="submit" className="w-full">Voir le formulaire</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplyIdPrompt;