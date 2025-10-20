import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Q12xLogin from "@/pages/q12x/Login";
import Q12xSignup from "@/pages/q12x/Signup";
import Q12xDashboardLayout from "@/pages/q12x/DashboardLayout";
import Q12xDashboard from "@/pages/q12x/Dashboard";

const queryClient = new QueryClient();

const Q12xApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/login" element={<Q12xLogin />} />
        <Route path="/" element={<Q12xSignup />} />
        
        <Route path="/dashboard" element={<Q12xDashboardLayout />}>
          <Route index element={<Q12xDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default Q12xApp;