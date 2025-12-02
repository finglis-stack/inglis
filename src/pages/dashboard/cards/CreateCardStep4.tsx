import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewCard } from '@/context/NewCardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CardAgreementPDF } from '@/components/dashboard/cards/CardAgreementPDF';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { getFunctionError } from '@/lib/utils';
import { PhysicalCardEncoder } from '@/components/dashboard/cards/PhysicalCardEncoder';
import { Switch } from '@/components/ui/switch';

const CreateCardStep4 = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { cardData, resetCard } = useNewCard();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  
  const [validationCode, setValidationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  
  // Mode encodage physique
  const [showEncoder, setShowEncoder] = useState(false);
  
  // Valeurs générées pour l'aperçu et l'encodage
  const [generatedCardNumber, setGeneratedCardNumber] = useState('');
  const [expiryDisplay, setExpiryDisplay] = useState('');

  useEffect(() => {
    setValidationCode(Math.floor(100000 + Math.random() * 900000).toString());
    
    // Pré-génération visuelle (sera confirmée par le backend lors de la création réelle)
    // Note: Pour l'encodage physique avant création DB, on utiliserait normalement les vraies valeurs.
    // Ici on simule pour l'UX.
    const future = new Date();
    future.setFullYear(future.getFullYear() + 4);
    setExpiryDisplay(`${(future.getMonth() + 1).toString().padStart(2, '0')}/${future.getFullYear().toString().slice(-2)}`);
  }, []);

  useEffect(() => {
    if (!cardData.profileId || !cardData.programId) {
      navigate('/dashboard/cards/new');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError("Utilisateur non authentifié.");
        navigate('/login');
        return;
      }

      const [profileRes, programRes, institutionRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', cardData.profileId).single(),
        supabase.from('card_programs').select('*').eq('id', cardData.programId).single(),
        supabase.from('institutions').select('name').eq('user_id', user.id).single()
      ]);

      if (profileRes.error || programRes.error || institutionRes.error) {
        showError('Erreur lors de la récupération des détails.');
        navigate('/dashboard/cards/new');
      } else {
        setProfile(profileRes.data);
        setProgram(programRes.data);
        setInstitution(institutionRes.data);
        
        // Simulation d'un numéro pour l'encodeur (en prod, appeler une fonction pour réserver le numéro)
        const tempNum = `${getInitials(profileRes.data)} ${programRes.data.bin} XX ${Math.floor(Math.random()*10000000)} X`;
        setGeneratedCardNumber(tempNum);
      }
      setLoading(false);
    };

    fetchData();
  }, [cardData, navigate]);

  const getInitials = (profile: any) => {
    const name = profile.type === 'personal' ? profile.full_name : profile.legal_name;
    return name ? name.substring(0, 2).toUpperCase() : 'XX';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-card', {
        body: {
          profile_id: cardData.profileId,
          card_program_id: cardData.programId,
          credit_limit: cardData.creditLimit,
          cash_advance_limit: cardData.cashAdvanceLimit,
          interest_rate: cardData.interestRate,
          cash_advance_rate: cardData.cashAdvanceRate,
        },
      });

      if (error) {
        throw new Error(getFunctionError(error, error.message));
      }

      showSuccess(t('newCard.successMessage'));
      resetCard();
      navigate('/dashboard/cards');
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Une erreur inconnue est survenue.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !profile || !program || !institution) {
    return <Skeleton className="h-64 w-full" />;
  }

  const userName = profile ? (profile.type === 'personal' ? profile.full_name : profile.legal_name) : undefined;
  const isCodeCorrect = validationCode === enteredCode;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader><CardTitle>{t('newCard.reviewTitle')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">{t('newCard.user')}</h4>
                <p className="text-muted-foreground">{userName}</p>
              </div>
              <div>
                <h4 className="font-semibold">{t('newCard.program')}</h4>
                <p className="text-muted-foreground">{program.program_name}</p>
              </div>
              {program.card_type === 'credit' && (
                <>
                  <div>
                    <h4 className="font-semibold">{t('newCard.creditLimit')}</h4>
                    <p className="text-muted-foreground">${cardData.creditLimit}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <CardPreview
            programName={program.program_name}
            cardType={program.card_type}
            cardColor={program.card_color}
            userName={userName}
            // En mode prévisualisation, on ne montre pas de numéro réel pour la sécurité
            // sauf si on est en mode encodage physique où on a besoin de visualiser
          />
        </div>
      </div>

      {/* Module d'encodage physique */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-semibold">Imprimer et encoder une carte physique</h3>
              <p className="text-xs text-muted-foreground">Activez cette option si vous avez un lecteur SLE4442 connecté.</p>
            </div>
          </div>
          <Switch checked={showEncoder} onCheckedChange={setShowEncoder} />
        </div>

        {showEncoder && (
          <PhysicalCardEncoder 
            cardData={{
              cardNumber: generatedCardNumber, 
              holderName: userName || '', 
              expiryDate: expiryDisplay
            }} 
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('newCard.agreementTitle')}</CardTitle>
          <CardDescription>{t('newCard.agreementDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PDFDownloadLink
            document={<CardAgreementPDF t={t} program={program} institution={institution} validationCode={validationCode} interestRate={cardData.interestRate} cashAdvanceRate={cardData.cashAdvanceRate} />}
            fileName={`${t('newCard.pdf.fileName')}_${userName?.replace(/\s/g, '_')}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <Button variant="outline" disabled={pdfLoading}>
                <Download className="mr-2 h-4 w-4" />
                {pdfLoading ? t('newCard.generatingPDF') : t('newCard.downloadAgreement')}
              </Button>
            )}
          </PDFDownloadLink>

          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="validation-code">{t('newCard.enterValidationCode')}</Label>
            <InputOTP id="validation-code" maxLength={6} value={enteredCode} onChange={setEnteredCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate('/dashboard/cards/new/step-3')} disabled={submitting}>
          {t('sharedSteps.previous')}
        </Button>
        <Button onClick={handleSubmit} disabled={!isCodeCorrect || submitting}>
          {submitting ? t('newCard.creating') : t('newCard.createButton')}
        </Button>
      </div>
    </div>
  );
};

export default CreateCardStep4;