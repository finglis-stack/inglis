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
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { UploadCloud, DownloadCloud, Loader2, Info, AlertTriangle } from 'lucide-react';
import CreditReportDisplay from '@/components/dashboard/users/CreditReportDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RiskAnalysis from '@/components/dashboard/users/RiskAnalysis';

const UserProfile = () => {
  const { id } = useParams();
  const { t } = useTranslation('dashboard');
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
  const [isPushing, setIsPushing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [pulledReport, setPulledReport] = useState(null);
  const [isReportExpired, setIsReportExpired] = useState(false);
  const [riskAssessments, setRiskAssessments] = useState([]);

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

  const handlePushToCreditBureau = async () => {
    setIsPushing(true);
    try {
      const { error } = await supabase.functions.invoke('request-credit-bureau-consent', {
        body: { profile_id: profile.id },
      });
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      showSuccess("L'e-mail de demande de consentement a été envoyé à l'utilisateur.");
    } catch (err) {
      showError(err.message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleRequestReport = async () => {
    setIsRequesting(true);
    try {
      const { error } = await supabase.functions.invoke('request-credit-report-pull', {
        body: { profile_id: profile.id },
      });
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      showSuccess("L'e-mail de demande de consultation a été envoyé à l'utilisateur.");
    } catch (err) {
      showError(err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    const fetchProfileAndReport = async () => {
      if (!id) return;
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profileError) {
        setError(t('userProfile.loadingError'));
        setLoading(false);
        return;
      }
      setProfile(profileData);
      if (!profileData.pin) {
        setIsUnlocked(true);
      }

      const { data: reportData, error: reportError } = await supabase
        .from('pulled_credit_reports')
        .select('report_data, created_at, expires_at')
        .eq('profile_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (reportData) {
        const isExpired = new Date(reportData.expires_at) < new Date();
        setIsReportExpired(isExpired);
        if (!isExpired) {
          setPulledReport(reportData);
        }
      }

      setLoading(false);
    };
    fetchProfileAndReport();
  }, [id, t]);

  useEffect(() => {
    if (isUnlocked) {
      fetchLogs();
    }
  }, [isUnlocked, fetchLogs]);

  const handleUnlock = async (pin) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-pin', {
          body: {
              profile_id: profile.id,
              pin_to_verify: pin,
          },
      });

      if (error) {
          const functionError = await error.context.json();
          showError(`Erreur de vérification: ${functionError.error || error.message}`);
          return false;
      }

      if (!data.isValid) {
          return false;
      }

      setIsUnlocked(true);

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

      if (profile.type === 'personal') {
        if (profile.sin) {
          const { data: sinData, error: sinError } = await supabase.functions.invoke('get-decrypted-sin', {
            body: { profile_id: profile.id },
          });
          if (sinError) {
            const functionError = await sinError.context.json();
            throw new Error(functionError.error || sinError.message);
          }
          setDecryptedSin(sinData.sin);
        }
        if (profile.address) {
          const { data: addressData, error: addressError } = await supabase.functions.invoke('get-decrypted-address', {
            body: { profile_id: profile.id },
          });
          if (addressError) {
            const functionError = await addressError.context.json();
            throw new Error(functionError.error || addressError.message);
          }
          setDecryptedAddress(addressData.address);
        }
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profile_access_logs')
          .insert({ profile_id: profile.id, visitor_user_id: user.id });
        fetchLogs(); // Refresh logs after inserting
      }

      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('transaction_risk_assessments')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (assessmentsError) throw assessmentsError;
      setRiskAssessments(assessmentsData || []);
      
      return true;
    } catch (e) {
      showError(`Une erreur est survenue: ${e.message}`);
      return false;
    }
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
  if (!profile) return <div className="text-center p-4">{t('userProfile.notFound')}</div>;

  return (
    <TooltipProvider>
      <div className="p-4 relative">
        {!isUnlocked && profile.pin && <PinLock onUnlock={handleUnlock} />}
        
        <div className={cn({ 'blur-sm pointer-events-none': !isUnlocked && profile.pin })}>
          {profile.type === 'personal' && (
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" onClick={handleRequestReport} disabled={isRequesting || !profile.sin}>
                {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                {t('userProfile.requestCreditReport')}
              </Button>
              <Button onClick={handlePushToCreditBureau} disabled={isPushing || !profile.sin}>
                {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {t('userProfile.pushToCreditBureau')}
              </Button>
            </div>
          )}
          {profile.type === 'personal' && <PersonalProfile profile={profile} decryptedSin={decryptedSin} decryptedAddress={decryptedAddress} cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} profileId={profile.id} />}
          {profile.type === 'corporate' && <CorporateProfile profile={profile} cards={cards} creditAccounts={creditAccounts} debitAccounts={debitAccounts} profileId={profile.id} />}
        </div>

        {isUnlocked && (
          <div className="mt-6">
            <RiskAnalysis assessments={riskAssessments} />
          </div>
        )}

        {isUnlocked && pulledReport && !isReportExpired && (
          <>
            <Alert className="mt-6">
              <Info className="h-4 w-4" />
              <AlertTitle>{t('userProfile.creditReportAvailable')}</AlertTitle>
              <AlertDescription>
                {t('userProfile.creditReportAvailableDesc', { date: new Date(pulledReport.expires_at).toLocaleString('fr-CA') })}
              </AlertDescription>
            </Alert>
            <CreditReportDisplay report={pulledReport.report_data} />
          </>
        )}
        {isUnlocked && isReportExpired && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('userProfile.consultationExpired')}</AlertTitle>
            <AlertDescription>
              {t('userProfile.consultationExpiredDesc')}
            </AlertDescription>
          </Alert>
        )}

        {isUnlocked && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <AccessLog logs={accessLogs} />
            <div className="flex items-center justify-center gap-4">
              <ChangePinDialog profileId={profile.id} onPinChanged={handlePinChanged} />
              <ResetPinDialog profileId={profile.id}>
                <Button variant="secondary">{t('userProfile.resetProfilePin')}</Button>
              </ResetPinDialog>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default UserProfile;