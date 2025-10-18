import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCreditAccountBalance = (accountId: string) => {
  return useQuery({
    queryKey: ['credit-account-balance', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_credit_account_balance', {
        p_account_id: accountId,
      });

      if (error) throw error;
      
      // La fonction retourne un tableau avec un seul élément
      return data[0] || {
        current_balance: 0,
        available_credit: 0,
        total_purchases: 0,
        total_payments: 0,
        total_interest: 0,
        total_cash_advances: 0,
      };
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    staleTime: 25000, // Considérer les données comme fraîches pendant 25 secondes
  });
};