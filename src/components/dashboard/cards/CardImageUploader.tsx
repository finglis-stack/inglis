import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface CardImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  recommendedWidth?: number;   // default 1200
  recommendedHeight?: number;  // default 756
  className?: string;
}

export const CardImageUploader: React.FC<CardImageUploaderProps> = ({
  value,
  onChange,
  recommendedWidth = 1200,
  recommendedHeight = 756,
  className,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      showError('Veuillez sélectionner une image PNG/JPG/WEBP.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `card-designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('card-designs').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('card-designs').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      setPreview(publicUrl);
      onChange(publicUrl);
      showSuccess('Image téléversée avec succès.');
    } catch (err: any) {
      showError(err?.message || 'Erreur lors du téléversement. Assurez-vous que le bucket "card-designs" existe et est public.');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreview(url || undefined);
    onChange(url);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label>Image de la carte</Label>
        <p className="text-xs text-muted-foreground">
          Dimensions recommandées: {recommendedWidth}×{recommendedHeight} px (ratio ~1.586), formats acceptés: PNG/JPG/WEBP.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileSelect} disabled={uploading} />
        <Button variant="outline" disabled={uploading}>
          {uploading ? 'Téléversement...' : 'Choisir un fichier'}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>ou coller une URL d’image</Label>
        <Input type="url" placeholder="https://exemple.com/mon-design.jpg" value={value || ''} onChange={handleUrlChange} />
      </div>

      {preview && (
        <div className="mt-2">
          <div className="rounded-xl border overflow-hidden w-full max-w-md aspect-[1.586] bg-gray-100">
            <div
              className="w-full h-full bg-center bg-cover"
              style={{ backgroundImage: `url(${preview})` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CardImageUploader;