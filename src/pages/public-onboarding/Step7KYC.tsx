import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { resizeImage } from '@/utils/imageResizer';

const acceptedIDs = [
  "Permis de conduire ou d'apprenti conducteur",
  "Carte d'assurance maladie avec photo",
  "Passeport canadien ou étranger",
  "Carte ou certificat de citoyenneté canadienne",
  "Carte de résident permanent du Canada",
  "Certificat de statut d'Indien"
];

const Step7KYC = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const { t } = useTranslation('public-onboarding');

  const [imageFront, setImageFront] = useState<string | null>(null);
  const [imageBack, setImageBack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputBackRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setError(null);
      try {
        // Redimensionner l'image à une largeur/hauteur max de 1024px
        const resizedDataUrl = await resizeImage(file, 1024, 1024);
        if (side === 'front') setImageFront(resizedDataUrl);
        else setImageBack(resizedDataUrl);
      } catch (err) {
        setError("Erreur lors du traitement de l'image. Veuillez réessayer.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!imageFront || !imageBack) {
      setError("Veuillez téléverser le recto et le verso de votre pièce d'identité.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('process-kyc', {
        body: { applicationId, imageFront, imageBack },
      });

      if (functionError) {
        if (data?.error === 'image_quality') {
          setError(data.message);
          setImageFront(null);
          setImageBack(null);
          if(fileInputFrontRef.current) fileInputFrontRef.current.value = '';
          if(fileInputBackRef.current) fileInputBackRef.current.value = '';
        } else {
          const errorMessage = data?.message || "Une erreur est survenue lors de la vérification.";
          throw new Error(errorMessage);
        }
      } else {
        navigate(`../step-8`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Vérification d'Identité</h2>
      <p className="text-muted-foreground">Pour finaliser votre demande, veuillez téléverser une photo de votre pièce d'identité.</p>

      <Alert>
        <AlertTitle>Pièces d'identité acceptées</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 text-sm">
            {acceptedIDs.map(id => <li key={id}>{id}</li>)}
          </ul>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Recto de la pièce</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            {imageFront ? (
              <img src={imageFront} alt="Aperçu recto" className="max-h-40 mx-auto" />
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Cliquez pour téléverser</p>
              </div>
            )}
            <Input ref={fileInputFrontRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} className="mt-4" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Verso de la pièce</Label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            {imageBack ? (
              <img src={imageBack} alt="Aperçu verso" className="max-h-40 mx-auto" />
            ) : (
              <div className="flex flex-col items-center justify-center h-40">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Cliquez pour téléverser</p>
              </div>
            )}
            <Input ref={fileInputBackRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} className="mt-4" />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={handleSubmit} disabled={loading || !imageFront || !imageBack}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Soumettre pour vérification
        </Button>
      </div>
    </div>
  );
};

export default Step7KYC;