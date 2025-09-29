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

const queryClient = new QueryClient();

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
            <Route path="users" element={<Users />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;