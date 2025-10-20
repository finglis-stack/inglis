import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import NotFound from "@/pages/NotFound";
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

const queryClient = new QueryClient();

const Q12xApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<Q12xOnboardingProvider />}>
          <Route path="/" element={<SignupLayout />}>
            <Route index element={<Step1Account />} />
            <Route path="business-info" element={<Step2BusinessInfo />} />
            <Route path="contact" element={<Step3Contact />} />
            <Route path="review" element={<Step4Review />} />
          </Route>
        </Route>

        <Route path="/login" element={<Q12xLogin />} />
        
        <Route path="/dashboard" element={<Q12xDashboardLayout />}>
          <Route index element={<Q12xDashboard />} />
          <Route path="transactions" element={<Q12xTransactions />} />
          <Route path="transactions/:id" element={<Q12xTransactionDetails />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default Q12xApp;