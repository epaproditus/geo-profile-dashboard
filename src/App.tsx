import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/geofences" element={<Geofences />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/app-catalog" element={<AppCatalog />} />
          <Route path="/simplemdm-test" element={<SimpleMDMTest />} />
          <Route path="/test-cards" element={<TestCardLayout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
