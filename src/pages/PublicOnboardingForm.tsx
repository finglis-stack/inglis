import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const PublicOnboardingForm = () => {
  const { formId } = useParams();
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
  });

  useEffect(() => {
    const fetchFormDetails = async () => {
      if (!formId) {
        setError("Lien d'invitation invalide ou manquant.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('onboarding_forms')
        .select('institutions(id, name, logo_url)')
        .eq('id', formId)
        .single();

      if (error || !data) {
        setError("Ce formulaire d'intégration n'est pas valide ou a expiré.");
      } else {
        setInstitution(data.institutions);
      }
      setLoading(false);
    };
    fetchFormDetails();
  }, [formId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('public-onboarding', {
        body: {
          formId,
          profileData: formData,
        },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      
      setSuccess(true);
    } catch (err) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Erreur</CardTitle></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Inscription Réussie !</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Merci. Votre profil a été créé. {institution.name} vous contactera sous peu avec les prochaines étapes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {institution.logo_url && <img src={institution.logo_url} alt={institution.name} className="h-12 w-auto mx-auto mb-4" />}
          <CardTitle>Devenez client chez {institution.name}</CardTitle>
          <CardDescription>Remplissez le formulaire ci-dessous pour créer votre profil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2"><Label htmlFor="fullName">Nom complet</Label><Input id="fullName" value={formData.fullName} onChange={handleChange} required /></div>
            <div className="grid gap-2"><Label htmlFor="email">Adresse e-mail</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} required /></div>
            <div className="grid gap-2"><Label htmlFor="phone">Numéro de téléphone</Label><Input id="phone" type="tel" value={formData.phone} onChange={handleChange} required /></div>
            <div className="grid gap-2"><Label htmlFor="dob">Date de naissance</Label><Input id="dob" type="date" value={formData.dob} onChange={handleChange} required /></div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon profil
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicOnboardingForm;