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
      
      setSecondsUntilRefresh(30);
      
      return data[0] || {
        current_balance: 0,
        available_balance: 0,
        total_deposits: 0,
        total_withdrawals: 0,
      };
    },
    refetchInterval: 30000,
    staleTime: 25000,
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