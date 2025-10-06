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
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';

const UserProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessLogs, setAccessLogs] = useState([]);
  const [decryptedSin, setDecryptedSin] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!id) return;
    
    const { data, error } = await supabase.rpc('get_profile_access_logs', { p_profile_id: id });
    
    if (error) {
      console.error("Erreur lors de l'appel RPC get_profile_access_logs:", error);
      showError(`Erreur lors de la récupération de l'historique: ${error.message}`);
      setAccessLogs([]);
    } else {
      setAccessLogs(data);
    }
  }, [id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) {
        setError('Profil non trouvé ou erreur de chargement.');
      } else {
        setProfile(data);
        if (!data.pin) {
          setIsUnlocked(true);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (isUnlocked) {
      fetchLogs();
    }
  }, [isUnlocked, fetchLogs]);

  const handleUnlock = async (pin) => {
    if (pin !== profile.pin) {
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Impossible de vérifier l'utilisateur.");
      return false;
    }

    const optimisticLog = {
      created_at: new Date().toISOString(),
      visitor_email: user.email,
    };
    setAccessLogs(prevLogs => [optimisticLog, ...prevLogs]);

    setIsUnlocked(true);

    // Décrypter le NAS
    if (profile.sin) {
      const { data: sinData, error: sinError } = await supabase.rpc('get_decrypted_sin', { p_profile_id: profile.id });
      if (sinError) {
        showError("Impossible de déchiffrer le NAS.");
      } else {
        setDecryptedSin(sinData);
      }
    }

    const { error: insertError } = await supabase
      .from('profile_access_logs')
      .insert({ profile_id: profile.id, visitor_user_id: user.id });

    if (insertError) {
      console.error("Failed to log profile access:", insertError);
      showError("Erreur lors de l'enregistrement de la visite. L'historique sera rafraîchi.");
      fetchLogs();
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
  if (!profile) return <div className="text-center p-4">Aucun profil trouvé.</div>;

  return (
    <TooltipProvider>
      <div className="p-4 relative">
        {!isUnlocked && profile.pin && <PinLock onUnlock={handleUnlock} />}
        
        <div className={cn({ 'blur-sm pointer-events-none': !isUnlocked && profile.pin })}>
          {profile.type === 'personal' && <PersonalProfile profile={profile} decryptedSin={decryptedSin} />}
          {profile.type === 'corporate' && <CorporateProfile profile={profile} />}
        </div>

        {isUnlocked && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <AccessLog logs={accessLogs} />
            <div className="flex items-center justify-center">
              <ChangePinDialog profileId={profile.id} onPinChanged={handlePinChanged} />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default UserProfile;