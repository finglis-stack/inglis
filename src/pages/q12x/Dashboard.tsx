import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Q12xDashboard = () => {
  const [merchant, setMerchant] = useState<any>(null);

  useEffect(() => {
    const fetchMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('merchant_accounts')
          .select('name')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setMerchant(data);
        }
      }
    };
    fetchMerchant();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Bienvenue, {merchant ? merchant.name : 'Marchand'} !
      </h1>
      <p className="text-muted-foreground mt-2">
        C'est ici que vous pourrez gérer vos checkouts et voir vos transactions.
      </p>
    </div>
  );
};

export default Q12xDashboard;