import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from 'react';
import { BrandingProvider } from '@/context/BrandingContext';

// --- App Chooser & Routers ---
import LocalhostChooser from '@/pages/LocalhostChooser';
import ApplyRoutes from '@/pages/ApplyRoutes';

// --- MainApp Imports ---
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Welcome from "@/pages/onboarding/Welcome";
import CreateAccount from "@/pages/onboarding/CreateAccount";
import InstitutionInfo from "@/pages/onboarding/InstitutionInfo";
import InstitutionType from "@/pages/onboarding/InstitutionType";
import ContactInfo from "@/pages/onboarding/ContactInfo";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import DashboardLayout from "@/pages/DashboardLayout";
import Cards from "@/pages/dashboard/Cards";
import Users from "@/pages/dashboard/Users";
import Transactions from "@/pages/dashboard/Transactions";
import Settings from "@/pages/dashboard/Settings";
import { NewUserProvider } from "@/context/NewUserContext";
import { NewUserTypeSelection } from "@/pages/dashboard/users/NewUserTypeSelection";
import Step1Name from "@/pages/dashboard/users/personal/Step1Name";
import Step2Address from "@/pages/dashboard/users/personal/Step2Address";
import Step3ContactIdentity from "@/pages/dashboard/users/personal/Step3ContactIdentity";
import Step4SetPin from "@/pages/dashboard/users/shared/Step4SetPin";
import Step5Review from "@/pages/dashboard/users/personal/Step5Review";
import Step1BusinessInfo from "@/pages/dashboard/users/corporate/Step1BusinessInfo";
import Step2Registration from "@/pages/dashboard/users/corporate/Step2Registration";
import Step3AddressCorp from "@/pages/dashboard/users/corporate/Step3Address";
import Step5ReviewCorp from "@/pages/dashboard/users/corporate/Step5Review";
import UserProfile from "@/pages/dashboard/users/UserProfile";
import CreditFiles from "@/pages/dashboard/CreditFiles";
import CreditReportAccess from "@/pages/CreditReportAccess";
import CardPrograms from "@/pages/dashboard/settings/CardPrograms";
import NewCardProgram from "@/pages/dashboard/settings/NewCardProgram";
import CardProgramLayout from "@/pages/dashboard/settings/CardProgramLayout";
import NewUserLayout from "@/pages/dashboard/users/NewUserLayout";
import { NewCardProvider } from "@/context/NewCardContext";
import CreateCardLayout from "@/pages/dashboard/cards/CreateCardLayout";
import CreateCardStep1 from "@/pages/dashboard/cards/CreateCardStep1";
import CreateCardStep2 from "@/pages/dashboard/cards/CreateCardStep2";
import CreateCardStep3SetLimits from "@/pages/dashboard/cards/CreateCardStep3SetLimits";
import CreateCardStep4 from "@/pages/dashboard/cards/CreateCardStep4";
import DebitAccountDetails from "@/pages/dashboard/accounts/DebitAccountDetails";
import CreditAccountDetails from "@/pages/dashboard/accounts/CreditAccountDetails";
import StatementDetails from "@/pages/dashboard/accounts/StatementDetails";
import SetCardPin from "@/pages/SetCardPin";
import SetProfilePin from "@/pages/SetProfilePin";
import ConfirmCreditConsent from "@/pages/ConfirmCreditConsent";
import ConfirmCreditPull from "@/pages/ConfirmCreditPull";
import { NewTransactionProvider } from "@/context/NewTransactionContext";
import NewTransactionLayout from "@/pages/dashboard/accounts/NewTransactionLayout";
import Step1Details from "@/pages/dashboard/accounts/new-transaction/Step1Details";
import Step2Security from "@/pages/dashboard/accounts/new-transaction/Step2Security";
import Step3Review from "@/pages/dashboard/accounts/new-transaction/Step3Review";
import TransactionDetails from "@/pages/dashboard/accounts/TransactionDetails";
import PendingAuthorizations from "@/pages/dashboard/accounts/PendingAuthorizations";
import ApiSettings from "@/pages/dashboard/settings/ApiSettings";
import OnboardingFormsSettings from "@/pages/dashboard/settings/OnboardingFormsSettings";
import OnboardingFormEditor from "@/pages/dashboard/settings/OnboardingFormEditor";
import OnboardingFormLayout from "@/pages/dashboard/settings/OnboardingFormLayout";
import BrandingSettings from "@/pages/dashboard/settings/BrandingSettings";
import HostedPaymentForm from "@/pages/HostedPaymentForm";
import HostedFormLayout from '@/pages/HostedFormLayout';
import RiskAnalysisDetails from '@/pages/dashboard/risk/RiskAnalysisDetails';
import FraudAnalytics from './pages/dashboard/FraudAnalytics';
import CardIssuance from './pages/CardIssuance';
import FraudPrevention from './pages/FraudPrevention';
import CreditBureau from './pages/CreditBureau';
import Pricing from './pages/Pricing';
import Applications from '@/pages/dashboard/Applications';
import ApplicationDetails from '@/pages/dashboard/ApplicationDetails';

const FraudNetwork3D = lazy(() => import('./pages/dashboard/FraudNetwork3D'));

// --- Q12xApp Imports ---
import Q12xLogin from "@/pages/q12x/Login";
import Q12xDashboardLayout from "@/pages/q12x/DashboardLayout";
import Q12xDashboard from "@/pages/q12x/Dashboard";
import Q12xTransactions from "@/pages/q12x/Transactions";
import Q12xTransactionDetails from "@/pages/q12x/TransactionDetails";
import { Q12xOnboardingProvider } from "@/context/Q12xOnboardingContext";
import SignupLayout from "@/pages/q12x/SignupLayout";
import Step1Account from "@/pages/q12x/SignupStep1Account";
import Step2BusinessInfo from "@/pages/q12x/SignupStep2BusinessInfo";
import Step3Contact from "@/pages/q12x/SignupStep3Contact";
import Step4Review from "@/pages/q12x/SignupStep4Review";
import Checkouts from "@/pages/q12x/Checkouts";
import NewCheckout from "@/pages/q12x/NewCheckout";
import PublicCheckoutPage from "@/pages/q12x/PublicCheckoutPage";
import PaymentSuccess from "@/pages/q12x/PaymentSuccess";

const queryClient = new QueryClient();

const MainAppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/card-issuance" element={<CardIssuance />} />
    <Route path="/fraud-prevention" element={<FraudPrevention />} />
    <Route path="/credit-bureau" element={<CreditBureau />} />
    <Route path="/credit-report-access" element={<CreditReportAccess />} />
    <Route path="/set-card-pin/:token" element={<SetCardPin />} />
    <Route path="/set-profile-pin/:token" element={<SetProfilePin />} />
    <Route path="/confirm-credit-consent/:token" element={<ConfirmCreditConsent />} />
    <Route path="/confirm-credit-pull/:token" element={<ConfirmCreditPull />} />
    <Route element={<HostedFormLayout />}><Route path="/checkout/v1/form" element={<HostedPaymentForm />} /></Route>
    <Route path="/pay/:checkoutId" element={<PublicCheckoutPage />} />
    <Route path="/onboarding/welcome" element={<Welcome />} />
    <Route path="/onboarding/create-account" element={<CreateAccount />} />
    <Route path="/onboarding/institution-info" element={<InstitutionInfo />} />
    <Route path="/onboarding/institution-type" element={<InstitutionType />} />
    <Route path="/onboarding/contact-info" element={<ContactInfo />} />
    <Route path="/dashboard" element={<DashboardLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="applications" element={<Applications />} />
      <Route path="applications/:id" element={<ApplicationDetails />} />
      <Route path="cards" element={<Cards />} />
      <Route path="transactions" element={<Transactions />} />
      <Route path="transactions/:id" element={<TransactionDetails />} />
      <Route path="credit-files" element={<CreditFiles />} />
      <Route path="settings" element={<Settings />} />
      <Route path="settings/card-programs" element={<CardPrograms />} />
      <Route path="settings/api" element={<ApiSettings />} />
      <Route path="settings/forms" element={<OnboardingFormsSettings />} />
      <Route path="settings/branding" element={<BrandingSettings />} />
      <Route path="users" element={<Users />} />
      <Route path="users/profile/:id" element={<UserProfile />} />
      <Route path="fraud-analytics" element={<FraudAnalytics />} />
      <Route path="fraud-network" element={
        <Suspense fallback={<div className="p-8">Chargement...</div>}>
          <FraudNetwork3D />
        </Suspense>
      } />
      <Route path="risk-analysis/:assessmentId" element={<RiskAnalysisDetails />} />
      <Route path="accounts/debit/:accountId" element={<DebitAccountDetails />} />
      <Route path="accounts/credit/:accountId" element={<CreditAccountDetails />} />
      <Route path="accounts/credit/:accountId/statements/:statementId" element={<StatementDetails />} />
      <Route path="accounts/debit/:accountId/pending-authorizations" element={<PendingAuthorizations />} />
      <Route path="accounts/credit/:accountId/pending-authorizations" element={<PendingAuthorizations />} />
    </Route>
    <Route element={<NewTransactionProvider />}><Route path="/dashboard/accounts/debit/:accountId/new-transaction" element={<NewTransactionLayout />}><Route index element={<Step1Details />} /><Route path="step-2" element={<Step2Security />} /><Route path="step-3" element={<Step3Review />} /></Route></Route>
    <Route element={<NewTransactionProvider />}><Route path="/dashboard/accounts/credit/:accountId/new-transaction" element={<NewTransactionLayout />}><Route index element={<Step1Details />} /><Route path="step-2" element={<Step2Security />} /><Route path="step-3" element={<Step3Review />} /></Route></Route>
    <Route element={<NewUserProvider />}><Route path="/dashboard/users/new" element={<NewUserTypeSelection />} /><Route element={<NewUserLayout />}><Route path="/dashboard/users/new/personal/step-1" element={<Step1Name />} /><Route path="/dashboard/users/new/personal/step-2" element={<Step2Address />} /><Route path="/dashboard/users/new/personal/step-3" element={<Step3ContactIdentity />} /><Route path="/dashboard/users/new/personal/step-4" element={<Step4SetPin />} /><Route path="/dashboard/users/new/personal/step-5" element={<Step5Review />} /><Route path="/dashboard/users/new/corporate/step-1" element={<Step1BusinessInfo />} /><Route path="/dashboard/users/new/corporate/step-2" element={<Step2Registration />} /><Route path="/dashboard/users/new/corporate/step-3" element={<Step3AddressCorp />} /><Route path="/dashboard/users/new/corporate/step-4" element={<Step4SetPin />} /><Route path="/dashboard/users/new/corporate/step-5" element={<Step5ReviewCorp />} /></Route></Route>
    <Route element={<NewCardProvider />}><Route element={<CreateCardLayout />}><Route path="/dashboard/cards/new" element={<CreateCardStep1 />} /><Route path="/dashboard/cards/new/step-2" element={<CreateCardStep2 />} /><Route path="/dashboard/cards/new/step-3" element={<CreateCardStep3SetLimits />} /><Route path="/dashboard/cards/new/step-4" element={<CreateCardStep4 />} /></Route></Route>
    <Route element={<CardProgramLayout />}><Route path="/dashboard/settings/card-programs/new" element={<NewCardProgram />} /></Route>
    <Route element={<OnboardingFormLayout />}><Route path="/dashboard/settings/forms/new" element={<OnboardingFormEditor />} /><Route path="/dashboard/settings/forms/edit/:formId" element={<OnboardingFormEditor />} /></Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const Q12xAppRoutes = () => (
  <Routes>
    <Route element={<Q12xOnboardingProvider />}><Route path="/" element={<SignupLayout />}><Route index element={<Step1Account />} /><Route path="business-info" element={<Step2BusinessInfo />} /><Route path="contact" element={<Step3Contact />} /><Route path="review" element={<Step4Review />} /></Route></Route>
    <Route path="/login" element={<Q12xLogin />} />
    <Route path="/dashboard" element={<Q12xDashboardLayout />}><Route index element={<Q12xDashboard />} /><Route path="transactions" element={<Q12xTransactions />} /><Route path="transactions/:id" element={<Q12xTransactionDetails />} /><Route path="checkouts" element={<Checkouts />} /><Route path="checkouts/new" element={<NewCheckout />} /></Route>
    <Route path="/pay/:checkoutId" element={<PublicCheckoutPage />} />
    <Route path="/payment-success" element={<PaymentSuccess />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppContent = () => {
  const [localhostApp, setLocalhostApp] = useState(() => localStorage.getItem('dyad-app-choice'));

  const handleAppChoice = (choice: 'main' | 'q12x' | 'apply') => {
    localStorage.setItem('dyad-app-choice', choice);
    setLocalhostApp(choice);
  };

  const hostname = window.location.hostname;

  if (hostname === 'localhost') {
    if (localhostApp === 'main') return <MainAppRoutes />;
    if (localhostApp === 'q12x') return <Q12xAppRoutes />;
    if (localhostApp === 'apply') return <ApplyRoutes />;
    return <LocalhostChooser onChoose={handleAppChoice} />;
  }

  const isQ12x = hostname.includes('q12x');
  const isApply = hostname.includes('apply');

  if (isQ12x) return <Q12xAppRoutes />;
  if (isApply) return <ApplyRoutes />;
  return <MainAppRoutes />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrandingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </BrandingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;