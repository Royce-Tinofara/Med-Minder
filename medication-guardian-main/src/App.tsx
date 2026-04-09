import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/Layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Medications from "./pages/Medications";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Caregivers from "./pages/Caregivers";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
      <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Protected route wrapper - requires authentication
const ProtectedRoute = () => {
  const { loading, profile } = useAuth();
  
  // Check localStorage directly to handle immediate navigation after login
  const storedProfile = !profile ? localStorage.getItem("userData") : null;
  const effectiveProfile = profile || (storedProfile ? JSON.parse(storedProfile) : null);
  
  if (loading && !effectiveProfile) {
    return <LoadingSpinner />;
  }
  
  if (!effectiveProfile) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

// Public route wrapper - redirects to dashboard if already logged in  
const PublicOnlyRoute = () => {
  const { loading, profile } = useAuth();
  
  // Check localStorage directly to handle immediate check
  const storedProfile = !profile ? localStorage.getItem("userData") : null;
  const effectiveProfile = profile || (storedProfile ? JSON.parse(storedProfile) : null);
  
  if (loading && !effectiveProfile) {
    return <LoadingSpinner />;
  }
  
  if (effectiveProfile) {
    // Redirect to role-specific dashboard
    const redirectPath = effectiveProfile.role === "pharmacist" 
      ? "/pharmacist" 
      : effectiveProfile.role === "caregiver" 
        ? "/caregiver-dashboard" 
        : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }
  
  return <Outlet />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
            <Routes>
              {/* Public routes - only accessible when NOT logged in */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
              
              {/* Protected routes - require authentication */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="medications" element={<Medications />} />
                  <Route path="reminders" element={<Reminders />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="caregivers" element={<Caregivers />} />
                  <Route path="pharmacist" element={<PharmacistDashboard />} />
                  <Route path="caregiver-dashboard" element={<CaregiverDashboard />} />
                  <Route path="chat" element={<Chat />} />
                </Route>
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
