import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PersonalProfile from '@/components/dashboard/users/PersonalProfile';
import CorporateProfile from '@/components/dashboard/users/CorporateProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

const UserProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError('Profil non trouvé ou erreur de chargement.');
        console.error(error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!profile) {
    return <div className="text-center p-4">Aucun profil trouvé.</div>;
  }

  return (
    <TooltipProvider>
      <div className="p-4">
        {profile.type === 'personal' && <PersonalProfile profile={profile} />}
        {profile.type === 'corporate' && <CorporateProfile profile={profile} />}
      </div>
    </TooltipProvider>
  );
};

export default UserProfile;