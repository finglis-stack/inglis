import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, UploadCloud, Link, Copy, Check } from 'lucide-react';

const BrandingSettings = () => {
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInstitution = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, logo_url, onboarding_form_id')
          .eq('user_id', user.id)
          .single();
        if (error) showError(error.message);
        else setInstitution(data);
      }
      setLoading(false);
    };
    fetchInstitution();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !institution) return;

    setUploading(true);
    try {
      const filePath = `${institution.id}/logo.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('data-logo')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('data-logo').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('institutions')
        .update({ logo_url: `${publicUrl}?t=${new Date().getTime()}` }) // Add timestamp to break cache
        .eq('id', institution.id);

      if (updateError) throw updateError;

      setInstitution({ ...institution, logo_url: `${publicUrl}?t=${new Date().getTime()}` });
      showSuccess("Logo mis à jour avec succès !");
      window.location.reload(); // Reload to update sidebar
    } catch (error) {
      showError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateForm = async () => {
    setGenerating(true);
    try {
      const { data: form, error: formError } = await supabase
        .from('onboarding_forms')
        .insert({ institution_id: institution.id })
        .select('id')
        .single();
      
      if (formError) throw formError;

      const { error: updateError } = await supabase
        .from('institutions')
        .update({ onboarding_form_id: form.id })
        .eq('id', institution.id);
      
      if (updateError) throw updateError;

      setInstitution({ ...institution, onboarding_form_id: form.id });
      showSuccess("Formulaire d'intégration généré !");
    } catch (error) {
      showError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const onboardingUrl = institution?.onboarding_form_id 
    ? `${window.location.origin}/apply/${institution.onboarding_form_id}`
    : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(onboardingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Branding & Site Web</h1>
      <Card>
        <CardHeader>
          <CardTitle>Logo de l'Institution</CardTitle>
          <CardDescription>Téléversez le logo de votre institution. Il sera affiché dans le tableau de bord et sur les pages publiques.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          {institution?.logo_url ? (
            <img src={institution.logo_url} alt={institution.name} className="h-16 w-auto bg-gray-200 p-2 rounded-md" />
          ) : (
            <div className="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center text-muted-foreground">Logo</div>
          )}
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Téléversement..." : "Changer le logo"}
            </Label>
            <Input id="logo-upload" type="file" className="hidden" onChange={handleLogoUpload} disabled={uploading} accept="image/png, image/jpeg, image/svg+xml" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formulaire d'Intégration Client</CardTitle>
          <CardDescription>Générez un lien public pour permettre à vos clients de s'inscrire et de créer un profil.</CardDescription>
        </CardHeader>
        <CardContent>
          {institution?.onboarding_form_id ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Votre lien d'intégration est prêt :</p>
              <div className="flex items-center gap-2">
                <Input value={onboardingUrl} readOnly />
                <Button variant="outline" size="icon" onClick={copyUrl}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Partagez ce lien avec vos clients pour qu'ils puissent créer leur profil.</p>
            </div>
          ) : (
            <Button onClick={handleGenerateForm} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link className="mr-2 h-4 w-4" />}
              Générer le lien du formulaire
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandingSettings;