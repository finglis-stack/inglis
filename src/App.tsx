import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
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
import Step4Review from "@/pages/dashboard/users/personal/Step4Review";
import Step1BusinessInfo from "@/pages/dashboard/users/corporate/Step1BusinessInfo";
import Step2Registration from "@/pages/dashboard/users/corporate/Step2Registration";
import Step3AddressCorp from "@/pages/dashboard/users/corporate/Step3Address";
import Step4ReviewCorp from "@/pages/dashboard/users/corporate/Step4Review";

const queryClient = new QueryClient();

const NewUserRoutes = () => (
  <NewUserProvider>
    <Outlet />
  </NewUserProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/card-structure" element={<CardStructure />} />
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/create-account" element={<CreateAccount />} />
          <Route path="/onboarding/institution-info" element={<InstitutionInfo />} />
          <Route path="/onboarding/institution-type" element={<InstitutionType />} />
          <Route path="/onboarding/contact-info" element={<ContactInfo />} />
          
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="cards" element={<Cards />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<Settings />} />
            
            <Route path="users" element={<NewUserRoutes />}>
              <Route index element={<Users />} />
              <Route path="new" element={<NewUserTypeSelection />} />
              <Route path="new/personal/step-1" element={<Step1Name />} />
              <Route path="new/personal/step-2" element={<Step2Address />} />
              <Route path="new/personal/step-3" element={<Step3ContactIdentity />} />
              <Route path="new/personal/step-4" element={<Step4Review />} />
              <Route path="new/corporate/step-1" element={<Step1BusinessInfo />} />
              <Route path="new/corporate/step-2" element={<Step2Registration />} />
              <Route path="new/corporate/step-3" element={<Step3AddressCorp />} />
              <Route path="new/corporate/step-4" element={<Step4ReviewCorp />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;