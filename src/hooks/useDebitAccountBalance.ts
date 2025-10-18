import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export const useDebitAccountBalance = (accountId: string) => {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(30);

  const query = useQuery({
    queryKey: ['debit-account-balance', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_debit_account_balance', {
        p_account_id: accountId,
      });

      if (error) throw error;
      
      // Réinitialiser le compteur à chaque fetch
      setSecondsUntilRefresh(30);
      
      // La fonction retourne un tableau avec un seul élément
      return data[0] || {
        current_balance: 0,
        total_deposits: 0,
        total_withdrawals: 0,
      };
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 25000, // Considérer les données comme fraîches pendant 25 secondes
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...query,
    secondsUntilRefresh,
  };
};