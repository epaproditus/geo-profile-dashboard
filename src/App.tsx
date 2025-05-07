import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./lib/supabase";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Geofences from "./pages/Geofences";
import Devices from "./pages/Devices";
import Profiles from "./pages/Profiles";
import NotFound from "./pages/NotFound";
import SimpleMDMTest from "./pages/SimpleMDMTest";
import AppCatalog from "./pages/AppCatalog";
import TestCardLayout from "./pages/TestCardLayout";
import PolicyAssignmentTest from "./pages/PolicyAssignmentTest";
import AuthCheck from "./components/AuthCheck";
import AuthCallback from "./pages/auth/Callback";

const queryClient = new QueryClient();

const App = () => {
  // Set up Supabase auth listener
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/callback" element={<AuthCallback />} /> {/* Added direct callback route */}
            
            {/* Protected routes - require authentication */}
            <Route path="/dashboard" element={<AuthCheck><Dashboard /></AuthCheck>} />
            <Route path="/geofences" element={<AuthCheck><Geofences /></AuthCheck>} />
            <Route path="/devices" element={<AuthCheck><Devices /></AuthCheck>} />
            <Route path="/profiles" element={<AuthCheck><Profiles /></AuthCheck>} />
            <Route path="/app-catalog" element={<AuthCheck><AppCatalog /></AuthCheck>} />
            <Route path="/simplemdm-test" element={<AuthCheck><SimpleMDMTest /></AuthCheck>} />
            <Route path="/test-cards" element={<AuthCheck><TestCardLayout /></AuthCheck>} />
            <Route path="/policy-assignment-test" element={<AuthCheck><PolicyAssignmentTest /></AuthCheck>} />
            
            {/* Fallback route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
