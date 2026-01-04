import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { UploadCloud, DownloadCloud, Loader2, Info, AlertTriangle } from 'lucide-react';
import CreditReportDisplay from '@/components/dashboard/users/CreditReportDisplay';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RiskAnalysis from '@/components/dashboard/users/RiskAnalysis';
import { getFunctionError } from '@/lib/utils';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import CreditSyncHeader from '@/components/dashboard/users/CreditSyncHeader';

type ExportFrequency = 'minute' | 'hour' | 'day' | 'week' | 'month';

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [decryptedSin, setDecryptedSin] = useState<string | null>(null);
  const [decryptedAddress, setDecryptedAddress] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<any[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<any[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [pulledReport, setPulledReport] = useState<any>(null);
  const [isReportExpired, setIsReportExpired] = useState(false);
  const [riskAssessments, setRiskAssessments] = useState<any[]>([]);

  // Alerte de résultat pour le push vers le bureau de crédit
  const [pushAlertMsg, setPushAlertMsg] = useState<string | null>(null);
  const [pushAlertType, setPushAlertType] = useState<'success' | 'error'>('success');

  // Préférences d’auto-export
  const [autoExportEnabled, setAutoExportEnabled] = useState<boolean>(false);
  const [autoExportFrequency, setAutoExportFrequency] = useState<ExportFrequency>('day');

  const fetchLogs = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.rpc('get_profile_access_logs', {
        p_profile_id: id,
      });

      if (error) throw error;
      setAccessLogs(data || []);
    } catch (e) {
      console.error("Log fetch error:", e);
    }
  }, [id]);

  const loadExportPreferences = useCallback(async (profileId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('credit_export_preferences')
      .select('enabled, frequency')
      .eq('profile_id', profileId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('Load export preferences error:', error.message);
      return;
    }
    if (data) {
      setAutoExportEnabled(!!data.enabled);
      setAutoExportFrequency((data.frequency as ExportFrequency) || 'day');
    }
  }, []);

  const saveExportPreferences = useCallback(async (nextEnabled?: boolean, nextFrequency?: ExportFrequency) => {
    if (!profile?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const enabledToSave = typeof nextEnabled === 'boolean' ? nextEnabled : autoExportEnabled;
    const frequencyToSave = nextFrequency || autoExportFrequency;

    const { data: existing } = await supabase
      .from('credit_export_preferences')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('credit_export_preferences')
        .update({
          enabled: enabledToSave,
          frequency: frequencyToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('credit_export_preferences')
        .insert({
          user_id: user.id,
          profile_id: profile.id,
          enabled: enabledToSave,
          frequency: frequencyToSave,
        });
    }

    // Aligner le drapeau d’auto-consentement du profil pour supprimer les emails si auto-export actif
    await supabase
      .from('profiles')
      .update({ credit_bureau_auto_consent: enabledToSave })
      .eq('id', profile.id);

    setAutoExportEnabled(enabledToSave);
    setAutoExportFrequency(frequencyToSave);
    setPushAlertType('success');
    setPushAlertMsg(
      enabledToSave
        ? `Export automatique activé (${labelForFrequency(frequencyToSave)}).`
        : 'Export automatique désactivé.'
    );
  }, [profile, autoExportEnabled, autoExportFrequency]);

  const labelForFrequency = (f: ExportFrequency) => {
    switch (f) {
      case 'minute': return 'minute';
      case 'hour': return 'heure';
      case 'day': return 'jour';
      case 'week': return 'semaine';
      case 'month': return 'mois';
      default: return f;
    }
  };

  const handlePushToCreditBureau = async () => {
    setIsPushing(true);
    setPushAlertMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('request-credit-bureau-consent', {
        body: { profile_id: profile.id },
      });
      if (error) throw new Error(getFunctionError(error, "Erreur inconnue."));
      // Message renvoyé: soit e-mail de consentement envoyé, soit synchro automatique
      const msg: string = data?.message || 'Opération effectuée.';
      setPushAlertType('success');
      setPushAlertMsg(msg);
    } catch (err: any) {
      setPushAlertType('error');
      setPushAlertMsg(err.message || 'Échec de l’opération.');
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
      if (error) throw new Error(getFunctionError(error, "Erreur inconnue."));
      // On conserve un toast pour la consultation; le besoin explicitement demandé concerne le push.
      setPushAlertType('success');
      setPushAlertMsg('Demande de consultation envoyée.');
    } catch (err: any) {
      setPushAlertType('error');
      setPushAlertMsg(err.message || 'Échec de la demande de consultation.');
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
      if (!profileData.pin) setIsUnlocked(true);

      // Charger préférences d’auto-export pour ce profil
      await loadExportPreferences(profileData.id);

      const { data: reportData } = await supabase
        .from('pulled_credit_reports')
        .select('report_data, created_at, expires_at')
        .eq('profile_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (reportData) {
        const isExpired = new Date(reportData.expires_at) < new Date();
        setIsReportExpired(isExpired);
        if (!isExpired) setPulledReport(reportData);
      }

      setLoading(false);
    };
    fetchProfileAndReport();
  }, [id, t, loadExportPreferences]);

  useEffect(() => {
    if (isUnlocked) fetchLogs();
  }, [isUnlocked, fetchLogs]);

  const handleUnlock = async (pin: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-pin', {
          body: { profile_id: profile.id, pin_to_verify: pin },
      });

      if (error || !data.isValid) {
          setPushAlertType('error');
          setPushAlertMsg('NIP incorrect.');
          return false;
      }

      setIsUnlocked(true);

      // Charger les données associées
      const [cardsRes, creditRes, debitRes, riskRes] = await Promise.all([
        supabase.from('cards').select('*, card_programs(program_name, card_type)').eq('profile_id', profile.id),
        supabase.from('credit_accounts').select('*').eq('profile_id', profile.id),
        supabase.from('debit_accounts').select('*').eq('profile_id', profile.id),
        supabase.from('transaction_risk_assessments').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(5)
      ]);

      setCards(cardsRes.data || []);
      setCreditAccounts(creditRes.data || []);
      setDebitAccounts(debitRes.data || []);
      setRiskAssessments(riskRes.data || []);

      // DÉCHIFFREMENT DES DONNÉES SENSIBLES
      try {
        if (profile.type === 'personal' && profile.sin) {
          const { data: sinData, error: sinError } = await supabase.functions.invoke('get-decrypted-sin', {
            body: { profile_id: profile.id },
          });
          if (!sinError) setDecryptedSin(sinData.sin);
        }

        const { data: addressData, error: addressError } = await supabase.functions.invoke('get-decrypted-address', {
          body: { profile_id: profile.id },
        });
        
        if (addressError) {
          console.error("Erreur déchiffrement adresse:", addressError);
        } else if (addressData && addressData.address) {
          setDecryptedAddress(addressData.address);
        }

      } catch (cryptError) {
         console.error("Crypto fetch error:", cryptError);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profile_access_logs').insert({ profile_id: profile.id, visitor_user_id: user.id });
        fetchLogs();
      }
      
      return true;
    } catch (e) {
      setPushAlertType('error');
      setPushAlertMsg('Erreur lors du déverrouillage.');
      return false;
    }
  };

  const handlePinChanged = (newPin: string) => {
    setProfile({ ...profile, pin: newPin });
  };

  if (loading) return <Skeleton className="h-screen w-full" />;
  if (error || !profile) return <div className="text-center p-4">{t('userProfile.notFound')}</div>;

  const addressToShow = decryptedAddress || (profile.address && !profile.address.encrypted ? profile.address : null) || (profile.business_address && !profile.business_address.encrypted ? profile.business_address : null);
  
  const profileForDisplay = {
    ...profile,
    address: profile.type === 'personal' ? addressToShow : null,
    business_address: profile.type === 'corporate' ? addressToShow : null
  };

  return (
    <TooltipProvider>
      <div className="p-4 relative">
        {!isUnlocked && profile.pin && <PinLock onUnlock={handleUnlock} />}
        
        <div className={cn({ 'blur-sm pointer-events-none': !isUnlocked && profile.pin })}>
          {/* Alerte de résultat (succès/erreur) pour les actions de push/consultation */}
          {pushAlertMsg && (
            <Alert className={cn(
              "mb-4",
              pushAlertType === 'success'
                ? "bg-green-50 text-green-700 border-green-200 [&>svg]:text-green-700"
                : "bg-red-50 text-red-700 border-red-200 [&>svg]:text-red-700"
            )}>
              {pushAlertType === 'success' ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{pushAlertType === 'success' ? 'Succès' : 'Erreur'}</AlertTitle>
              <AlertDescription>{pushAlertMsg}</AlertDescription>
            </Alert>
          )}

          {profile.type === 'personal' && (
            <CreditSyncHeader
              isPushing={isPushing}
              onPush={handlePushToCreditBureau}
              autoExportEnabled={autoExportEnabled}
              autoExportFrequency={autoExportFrequency}
              onToggleAutoExport={(enabled) => {
                setAutoExportEnabled(enabled);
                saveExportPreferences(enabled, undefined);
              }}
              onChangeFrequency={(val: ExportFrequency) => {
                setAutoExportFrequency(val);
                saveExportPreferences(undefined, val);
              }}
              isRequesting={isRequesting}
              onRequestReport={handleRequestReport}
              disabled={!profile.sin}
            />
          )}
          
          {profile.type === 'personal' && (
              <PersonalProfile 
                profile={profileForDisplay} 
                decryptedSin={decryptedSin} 
                decryptedAddress={profileForDisplay.address} 
                cards={cards} 
                creditAccounts={creditAccounts} 
                debitAccounts={debitAccounts} 
                profileId={profile.id} 
              />
          )}
          
          {profile.type === 'corporate' && (
              <CorporateProfile 
                profile={profileForDisplay} 
                cards={cards} 
                creditAccounts={creditAccounts} 
                debitAccounts={debitAccounts} 
                profileId={profile.id} 
              />
          )}
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
              <Button onClick={() => navigate(`/dashboard/users/profile/${profile.id}/fraud-settings`)}>
                Personnaliser l’anti‑fraude
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default UserProfile;