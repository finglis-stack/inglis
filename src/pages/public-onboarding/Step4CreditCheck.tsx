import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step4CreditCheck = () => {
  const navigate = useNavigate();
  const { formId } = useParams(); // Récupérer l'ID directement depuis l'URL
  const { t } = useTranslation('public-onboarding');
  const { updateData } = usePublicOnboarding();
  
  const [step, setStep] = useState<'enter_sin' | 'answer_questions' | 'no_report' | 'failed'>('enter_sin');
  const [sin, setSin] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [verificationId, setVerificationId] = useState('');

  const handleSinSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-credit-questions', {
        body: { sin, formId: formId }, // Utiliser l'ID de l'URL
      });
      if (error) throw error;

      if (data.status === 'no_report' || data.status === 'insufficient_data') {
        updateData({ creditBureauVerification: data.status });
        setStep('no_report');
      } else {
        setQuestions(data.questions);
        setVerificationId(data.verificationId);
        setStep('answer_questions');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    setLoading(true);
    try {
      const orderedAnswers = questions.map(q => answers[q.id]);
      const { data, error } = await supabase.functions.invoke('verify-credit-answers', {
        body: { verificationId, answers: orderedAnswers },
      });
      if (error) throw error;

      if (data.success) {
        updateData({ creditBureauVerification: 'passed', sin });
        navigate('../step-5');
      } else {
        updateData({ creditBureauVerification: 'failed' });
        setStep('failed');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="space-y-6">
      {step === 'enter_sin' && (
        <>
          <h2 className="text-xl font-semibold">{t('credit_check.title')}</h2>
          <p className="text-muted-foreground">{t('credit_check.subtitle')}</p>
          <div className="p-6 border-2 border-dashed rounded-lg bg-gray-50 flex flex-col items-center space-y-4">
            <Label htmlFor="sin" className="font-semibold">{t('credit_check.sin_label')}</Label>
            <InputOTP id="sin" maxLength={9} value={sin} onChange={setSin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={6} /><InputOTPSlot index={7} /><InputOTPSlot index={8} />
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground text-center">{t('credit_check.sin_desc')}</p>
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => navigate('../step-3')}>{t('credit_check.previous_button')}</Button>
            <Button onClick={handleSinSubmit} disabled={loading || sin.length !== 9}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('credit_check.next_button')}
            </Button>
          </div>
        </>
      )}

      {step === 'answer_questions' && (
        <>
          <h2 className="text-xl font-semibold">{t('credit_check.questions_title')}</h2>
          <p className="text-muted-foreground">{t('credit_check.questions_subtitle')}</p>
          <div className="space-y-8 pt-4">
            {questions.map((q, index) => (
              <div key={q.id}>
                <p className="font-semibold">{index + 1}. {q.text}</p>
                <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, value)} className="mt-2 space-y-1">
                  {q.options.map((option, i) => (
                    <div key={i} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                      <RadioGroupItem value={q.values ? q.values[i] : option} id={`${q.id}-${i}`} />
                      <Label htmlFor={`${q.id}-${i}`} className="font-normal">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-8">
            <Button onClick={handleAnswerSubmit} disabled={loading || Object.keys(answers).length < questions.length}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('credit_check.verify_button')}
            </Button>
          </div>
        </>
      )}

      {step === 'no_report' && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>{t('credit_check.no_report_title')}</AlertTitle>
          <AlertDescription>{t('credit_check.no_report_desc')}</AlertDescription>
          <div className="mt-4"><Button onClick={() => navigate('../step-5')}>{t('credit_check.continue_button')}</Button></div>
        </Alert>
      )}

      {step === 'failed' && (
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>{t('credit_check.failed_title')}</AlertTitle>
          <AlertDescription>{t('credit_check.failed_desc')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Step4CreditCheck;