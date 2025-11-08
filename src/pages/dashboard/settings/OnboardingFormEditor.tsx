import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const OnboardingFormEditor = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [loading, setLoading] = useState(false);
  const [cardPrograms, setCardPrograms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_credit_bureau_enabled: false,
    linked_card_program_ids: [] as string[],
    credit_limit_type: 'dynamic',
    fixed_credit_limit: '',
    background_image_url: '',
    auto_approve_enabled: false,
    soft_credit_limit: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data, error } = await supabase.from('card_programs').select('id, program_name');
      if (error) showError("Erreur lors de la récupération des programmes de cartes.");
      else setCardPrograms(data);
    };
    fetchPrograms();

    if (formId) {
      const fetchForm = async () => {
        const { data, error } = await supabase.from('onboarding_forms').select('*').eq('id', formId).single();
        if (error) {
          showError("Formulaire non trouvé.");
          navigate('/dashboard/settings/forms');
        } else {
          setFormData({
            name: data.name || '',
            description: data.description || '',
            is_credit_bureau_enabled: data.is_credit_bureau_enabled || false,
            linked_card_program_ids: data.linked_card_program_ids || [],
            credit_limit_type: data.credit_limit_type || 'dynamic',
            fixed_credit_limit: data.fixed_credit_limit || '',
            background_image_url: data.background_image_url || '',
            auto_approve_enabled: data.auto_approve_enabled || false,
            soft_credit_limit: data.soft_credit_limit || '',
          });
          setImagePreview(data.background_image_url);
        }
      };
      fetchForm();
    }
  }, [formId, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const { data: institution, error: institutionError } = await supabase.from('institutions').select('id').eq('user_id', user.id).single();
      if (institutionError) throw institutionError;

      let imageUrl = formData.background_image_url;
      if (imageFile) {
        const filePath = `public/${institution.id}/onboarding_forms/${formId || crypto.randomUUID()}/background-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, imageFile, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const dataToSave = {
        institution_id: institution.id,
        name: formData.name,
        description: formData.description,
        is_credit_bureau_enabled: formData.is_credit_bureau_enabled,
        linked_card_program_ids: formData.linked_card_program_ids,
        credit_limit_type: formData.credit_limit_type,
        fixed_credit_limit: formData.credit_limit_type === 'fixed' ? parseFloat(formData.fixed_credit_limit) : null,
        background_image_url: imageUrl,
        auto_approve_enabled: formData.auto_approve_enabled,
        soft_credit_limit: formData.soft_credit_limit ? parseFloat(formData.soft_credit_limit) : null,
      };

      if (formId) {
        const { error } = await supabase.from('onboarding_forms').update(dataToSave).eq('id', formId);
        if (error) throw error;
        showSuccess("Formulaire mis à jour avec succès !");
      } else {
        const { error } = await supabase.from('onboarding_forms').insert(dataToSave);
        if (error) throw error;
        showSuccess("Formulaire créé avec succès !");
      }
      navigate('/dashboard/settings/forms');
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  const handleSwitchChange = (id: string, checked: boolean) => setFormData(prev => ({ ...prev, [id]: checked }));
  const handleRadioChange = (value: string) => setFormData(prev => ({ ...prev, credit_limit_type: value }));
  const handleProgramSelection = (programId: string, checked: boolean) => {
    setFormData(prev => {
      const currentIds = prev.linked_card_program_ids;
      if (checked) return { ...prev, linked_card_program_ids: [...currentIds, programId] };
      else return { ...prev, linked_card_program_ids: currentIds.filter(id => id !== programId) };
    });
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{formId ? "Modifier le Formulaire" : "Créer un Formulaire"}</CardTitle>
        <CardDescription>Configurez les modules et les options pour votre formulaire de demande de carte public.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du formulaire</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea id="description" value={formData.description} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label>Image de fond</Label>
              <div className="flex items-center gap-4">
                {imagePreview && <img src={imagePreview} alt="Aperçu" className="h-16 w-32 object-cover rounded-md bg-gray-100 p-1" />}
                <Input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} className="max-w-xs" />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Automatisation</h3>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <Label htmlFor="auto_approve_enabled">Approbation Automatique</Label>
                <p className="text-sm text-muted-foreground">Tenter d'approuver et d'émettre la carte automatiquement après soumission.</p>
              </div>
              <Switch id="auto_approve_enabled" checked={formData.auto_approve_enabled} onCheckedChange={(checked) => handleSwitchChange('auto_approve_enabled', checked)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Modules</h3>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <Label htmlFor="is_credit_bureau_enabled">Intégration avec le bureau de crédit</Label>
                <p className="text-sm text-muted-foreground">Demander le NAS et le consentement pour consulter le dossier de crédit.</p>
              </div>
              <Switch id="is_credit_bureau_enabled" checked={formData.is_credit_bureau_enabled} onCheckedChange={(checked) => handleSwitchChange('is_credit_bureau_enabled', checked)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Programmes de Cartes</h3>
            <p className="text-sm text-muted-foreground">Sélectionnez les programmes de cartes qui seront proposés dans ce formulaire.</p>
            <ScrollArea className="h-40 border rounded-md p-4">
              <div className="space-y-2">
                {cardPrograms.map(program => (
                  <div key={program.id} className="flex items-center space-x-2">
                    <Checkbox id={`program-${program.id}`} checked={formData.linked_card_program_ids.includes(program.id)} onCheckedChange={(checked) => handleProgramSelection(program.id, checked as boolean)} />
                    <Label htmlFor={`program-${program.id}`}>{program.program_name}</Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-semibold">Limite de Crédit</h3>
            <RadioGroup value={formData.credit_limit_type} onValueChange={handleRadioChange}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="dynamic" id="dynamic" /><Label htmlFor="dynamic">Dynamique (basée sur le dossier de crédit)</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="fixed" id="fixed" /><Label htmlFor="fixed">Fixe</Label></div>
            </RadioGroup>
            {formData.credit_limit_type === 'fixed' && (
              <div className="grid gap-2 pl-6 pt-2">
                <Label htmlFor="fixed_credit_limit">Montant de la limite de crédit fixe</Label>
                <Input id="fixed_credit_limit" type="number" value={formData.fixed_credit_limit} onChange={handleChange} placeholder="5000.00" />
              </div>
            )}
             {formData.auto_approve_enabled && (
              <div className="grid gap-2 pt-4">
                <Label htmlFor="soft_credit_limit">Plafond de la limite de crédit (Soft Limit)</Label>
                <Input id="soft_credit_limit" type="number" value={formData.soft_credit_limit} onChange={handleChange} placeholder="10000.00" />
                <p className="text-xs text-muted-foreground">La limite de crédit approuvée automatiquement ne dépassera jamais ce montant.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formId ? "Sauvegarder les modifications" : "Créer le formulaire"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default OnboardingFormEditor;