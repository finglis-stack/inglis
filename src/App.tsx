import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Welcome from "@/pages/onboarding/Welcome";
import CreateAccount from "@/pages/onboarding/CreateAccount";
import InstitutionInfo from "@/pages/onboarding/InstitutionInfo";
import InstitutionType from "@/pages/onboarding/InstitutionType";
import ContactInfo from "@/pages/onboarding/ContactInfo";
import Dashboard from "@/pages/Dashboard";
import CardStructure from "@/pages/CardStructure";
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
import SetCardPin from "@/pages/SetCardPin";
import SetProfilePin from "@/pages/SetProfilePin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/card-structure" element={<CardStructure />} />
          <Route path="/credit-report-access" element={<CreditReportAccess />} />
          <Route path="/set-card-pin/:token" element={<SetCardPin />} />
          <Route path="/set-profile-pin/:token" element={<SetProfilePin />} />
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/create-account" element={<CreateAccount />} />
          <Route path="/onboarding/institution-info" element={<InstitutionInfo />} />
          <Route path="/onboarding/institution-type" element={<InstitutionType />} />
          <Route path="/onboarding/contact-info" element={<ContactInfo />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cards" element={<Cards />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="credit-files" element={<CreditFiles />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/card-programs" element={<CardPrograms />} />
            <Route path="users" element={<Users />} />
            <Route path="users/profile/:id" element={<UserProfile />} />
            <Route path="accounts/debit/:accountId" element={<DebitAccountDetails />} />
            <Route path="accounts/credit/:accountId" element={<CreditAccountDetails />} />
          </Route>

          <Route element={<NewUserProvider />}>
            <Route path="/dashboard/users/new" element={<NewUserTypeSelection />} />
            <Route element={<NewUserLayout />}>
              <Route path="/dashboard/users/new/personal/step-1" element={<Step1Name />} />
              <Route path="/dashboard/users/new/personal/step-2" element={<Step2Address />} />
              <Route path="/dashboard/users/new/personal/step-3" element={<Step3ContactIdentity />} />
              <Route path="/dashboard/users/new/personal/step-4" element={<Step4SetPin />} />
              <Route path="/dashboard/users/new/personal/step-5" element={<Step5Review />} />
              <Route path="/dashboard/users/new/corporate/step-1" element={<Step1BusinessInfo />} />
              <Route path="/dashboard/users/new/corporate/step-2" element={<Step2Registration />} />
              <Route path="/dashboard/users/new/corporate/step-3" element={<Step3AddressCorp />} />
              <Route path="/dashboard/users/new/corporate/step-4" element={<Step4SetPin />} />
              <Route path="/dashboard/users/new/corporate/step-5" element={<Step5ReviewCorp />} />
            </Route>
          </Route>

          <Route element={<NewCardProvider />}>
            <Route element={<CreateCardLayout />}>
              <Route path="/dashboard/cards/new" element={<CreateCardStep1 />} />
              <Route path="/dashboard/cards/new/step-2" element={<CreateCardStep2 />} />
              <Route path="/dashboard/cards/new/step-3" element={<CreateCardStep3SetLimits />} />
              <Route path="/dashboard/cards/new/step-4" element={<CreateCardStep4 />} />
            </Route>
          </Route>

          <Route element={<CardProgramLayout />}>
            <Route path="/dashboard/settings/card-programs/new" element={<NewCardProgram />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;