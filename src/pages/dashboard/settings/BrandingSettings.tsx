import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Upload } from 'lucide-react';

const BrandingSettings = () => {
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitution = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, logo_url')
          .eq('user_id', user.id)
          .single();
        
        if (error) showError(error.message);
        else {
          setInstitution(data);
          setLogoPreview(data.logo_url);
        }
      }
      setLoading(false);
    };
    fetchInstitution();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!logoFile) return;
    setUploading(true);

    try {
      const filePath = `public/${institution.id}/logo-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('institutions')
        .update({ logo_url: publicUrl })
        .eq('id', institution.id);

      if (updateError) throw updateError;

      showSuccess("Logo mis à jour avec succès !");
      setLogoFile(null);
    } catch (error) {
      showError(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Personnalisation de la Marque</CardTitle>
        <CardDescription>Gérez le logo de votre institution pour les communications et formulaires publics.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label>Logo de l'institution</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Aperçu du logo" className="h-16 w-auto object-contain rounded-md bg-gray-100 p-2" />
            ) : (
              <div className="h-16 w-32 bg-gray-100 rounded-md flex items-center justify-center text-sm text-muted-foreground">
                Aucun logo
              </div>
            )}
            <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={uploading || !logoFile}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Sauvegarder le logo
        </Button>
      </CardContent>
    </Card>
  );
};

export default BrandingSettings;