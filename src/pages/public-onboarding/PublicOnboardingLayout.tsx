import { useState, useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PublicOnboardingProvider } from '@/context/PublicOnboardingContext';
import { useTranslation } from 'react-i18next';

const PublicOnboardingLayout = () => {
  const { formId } = useParams();
  const { t } = useTranslation('public-onboarding');
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormDetails = async () => {
      if (!formId) {
        setError("Lien d'invitation invalide ou manquant.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-public-form-details', {
          body: { formId }
        });

        if (functionError) {
          const errorDetails = await functionError.context.json();
          throw new Error(errorDetails.error || "Ce formulaire d'intégration n'est pas valide ou a expiré.");
        }
        
        setFormConfig(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFormDetails();
  }, [formId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><h2 className="text-xl font-semibold text-destructive">Erreur</h2></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  const backgroundImage = formConfig?.formDetails?.background_image_url || '/onboarding-image.jpg';

  return (
    <PublicOnboardingProvider formConfig={formConfig}>
      <div className="min-h-screen flex">
        <div className="w-full lg:w-1/2 flex flex-col items-center p-4 sm:p-8">
          <header className="w-full max-w-2xl flex justify-between items-center mb-6">
            {formConfig.institution.logo_url ? (
              <img src={formConfig.institution.logo_url} alt={formConfig.institution.name} className="h-10 w-auto" />
            ) : (
              <h1 className="text-xl font-bold">{formConfig.institution.name}</h1>
            )}
            <LanguageSwitcher />
          </header>
          <main className="w-full max-w-2xl flex-grow flex items-center">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
        <div className="hidden lg:block lg:w-1/2 bg-cover bg-center relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-12 right-12 max-w-md text-right">
             <div className="inline-block bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-xl shadow-2xl">
                <p className="text-white font-thin text-3xl tracking-wide uppercase">
                  {t('layout.application_form')}
                </p>
             </div>
          </div>
        </div>
      </div>
    </PublicOnboardingProvider>
  );
};

export default PublicOnboardingLayout;