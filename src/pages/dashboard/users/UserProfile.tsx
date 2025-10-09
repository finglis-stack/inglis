import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PersonalProfile from '@/components/dashboard/users/PersonalProfile';
import CorporateProfile from '@/components/dashboard/users/CorporateProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import PinLock from '@/components/dashboard/users/PinLock';
import AccessLog from '@/components/dashboard/users/AccessLog';
import ChangePinDialog from '@/components/dashboard/users/ChangePinDialog';
import ResetPinDialog from '@/components/dashboard/users/ResetPinDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const UserProfile = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [decryptedSin, setDecryptedSin] = useState(null);
  const [decryptedAddress, setDecryptedAddress] = useState(null);
  const [cards, setCards] = useState([]);
  const [creditAccounts, setCreditAccounts] = useState([]);
  const [debitAccounts, setDebitAccounts] = useState([]);

  const fetchLogs = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.rpc('get_profile_access_logs', {
        p_profile_id: id,
      });

      if (error) {
        throw error;
      }
      setAccessLogs(data || []);
    } catch (e) {
      showError(`Erreur lors de la récupération de l'historique d'accès: ${e.message}`);
    }
  }, [id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) {
        setError(t('dashboard.userProfile.loadingError'));
      } else {
        setProfile(data);
        if (!data.pin) {
          setIsUnlocked(true);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [id, t]);

  useEffect(() => {
    if (isUnlocked) {
      fetchLogs();
    }
  }, [isUnlocked, fetchLogs]);

  const handleUnlock = async (pin) => {
    if (pin !== profile.pin) {
      return false;
    }

    setIsUnlocked(true);

    try {
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*, card_programs(program_name, card_type)')
        .eq('profile_id', profile.id);
      if (cardsError) throw cardsError;
      setCards(cardsData || []);

      const { data: creditAccountsData, error: creditAccountsError } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('profile_id', profile.id);
      if (creditAccountsError) throw creditAccountsError;
      setCreditAccounts(creditAccountsData || []);

      const { data: debitAccountsData, error: debitAccountsError } = await supabase
        .from('debit_accounts')
        .select('*')
        .eq('profile_id', profile.id);
      if (debitAccountsError) throw debitAccountsError;
      setDebitAccounts(debitAccountsData || []);
    } catch (e) {
      showError(`Erreur lors de la récupération des comptes : ${e.message}`);
    }

    if (profile.type === 'personal') {
      if (profile.sin) {
        try {
          const { data, error } = await supabase.functions.invoke('get-decrypted-sin', {
            body: { profile_id: profile.id },
          });

          if (error) {
            const functionError = await error.context.json();
            throw new Error(functionError.error || error.message);
          }
          setDecryptedSin(data.sin);
        } catch (e) {
          showError(`Impossible de déchiffrer le NAS: ${e.message}`);
        }
      }
      if (profile.address) {
        try {
          const { data, error } = await supabase.functions.invoke('get-decrypted-address', {
            body: { profile_id: profile.id },
          });

          if (error) {
            const functionError = await error.context.json();
            throw new Error(functionError.error || error.message);
          }
          setDecryptedAddress(data.address);
        } catch (e) {
          showError(`Impossible de déchiffrer l'adresse: ${e.message}`);
        }
      }
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profile_access_logs')
        .insert({ profile_id: profile.id, visitor_user_id: user.id });
      fetchLogs(); // Refresh logs after inserting
    }
    
    return true;
  };

  const handlePinChanged = (newPin) => {
    setProfile({ ...profile, pin: newPin });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;
  if (!profile) return <div className="text-center p-4">{t('dashboard.userProfile.notFound')}</div>;

  return (
    <TooltipProvider>
      <div className="p-4 relative">
        {!isUnlocked && profile.pin && <PinLock onUnlock={handleUnlock} />}
        
        <div className={cn({ 'blur-sm pointer-events-none': !isUnlocked && profile.pin })}>
          {profile.type === 'personal' && <PersonalProfile profile={profile} decryptedSin={decryptedSin} decryptedAddress={decryptedAddress} cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} profileId={profile.id} />}
          {profile.type === 'corporate' && <CorporateProfile profile={profile} cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} profileId={profile.id} />}
        </div>

        {isUnlocked && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <AccessLog logs={accessLogs} />
            <div className="flex items-center justify-center gap-4">
              <ChangePinDialog profileId={profile.id} onPinChanged={handlePinChanged} />
              <ResetPinDialog profileId={profile.id}>
                <Button variant="secondary">Réinitialiser NIP profil</Button>
              </ResetPinDialog>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default UserProfile;