import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { useLocation } from 'react-router-dom';
import { CardPreview } from '@/components/dashboard/CardPreview';

const Step7Confirmation = () => {
  const { t } = useTranslation('public-onboarding');
  const { formConfig } = usePublicOnboarding();
  const location = useLocation();
  const state = (location.state || {}) as { status?: string; decisionData?: any; selectedProgramId?: string };

  const selectedProgram = formConfig?.cardPrograms?.find((p: any) => p.id === state.selectedProgramId);

  if (state.status === 'approved') {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-2" />
        <h1 className="text-2xl font-bold tracking-tight">{t('review.approved_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('review.approved_desc')}</p>

        {selectedProgram && (
          <div className="max-w-md mx-auto">
            <CardPreview
              programName={selectedProgram.program_name}
              cardType={selectedProgram.card_type}
              cardImageUrl={selectedProgram.card_image_url}
            />
          </div>
        )}

        {state.decisionData?.approved_credit_limit > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{t('review.credit_limit_approved')}</p>
            <p className="text-2xl font-bold text-green-900">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(state.decisionData.approved_credit_limit)}
            </p>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground space-y-1">
          <p>{t('decision.activation_info')}</p>
          <p>{t('decision.legal_notice')}</p>
        </div>

        <Button onClick={() => window.location.reload()} className="mt-6">
          {t('confirmation.close_button')}
        </Button>
      </div>
    );
  }

  if (state.status === 'rejected') {
    return (
      <div className="space-y-6 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-2" />
        <h1 className="text-2xl font-bold tracking-tight">{t('review.rejected_title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('review.rejected_desc')}</p>

        {state.decisionData?.rejection_reason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-sm font-semibold text-red-800">{t('review.rejection_reasons')}:</p>
            <ul className="list-disc pl-5 mt-2 text-sm text-red-700">
              {(state.decisionData.rejection_reason).split('; ').map((reason: string, i: number) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          <p>{t('decision.legal_notice')}</p>
        </div>

        <Button onClick={() => window.location.reload()} className="mt-6">
          {t('confirmation.close_button')}
        </Button>
      </div>
    );
  }

  // Fallback: confirmation générique
  return (
    <div className="text-center">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-2" />
      <h1 className="text-2xl font-bold tracking-tight">{t('confirmation.title')}</h1>
      <p className="mt-2 text-muted-foreground">
        {t('confirmation.description', { institutionName: formConfig.institution.name })}
      </p>
      <Button onClick={() => window.location.reload()} className="mt-6">
        {t('confirmation.close_button')}
      </Button>
    </div>
  );
};

export default Step7Confirmation;