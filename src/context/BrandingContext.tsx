import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BrandingContext = createContext<{ logoUrl: string | null }>({ logoUrl: null });

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('institutions')
          .select('logo_url')
          .eq('user_id', session.user.id)
          .single();
        
        if (data && data.logo_url) {
          setLogoUrl(data.logo_url);
        }
      }
    };

    fetchBranding();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchBranding();
      }
      if (event === 'SIGNED_OUT') {
        setLogoUrl(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrandingContext.Provider value={{ logoUrl }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);