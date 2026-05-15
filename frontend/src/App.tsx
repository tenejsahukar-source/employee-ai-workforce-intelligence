import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EmployeeProvider } from './context/EmployeeContext';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute, PublicRoute } from './routes/RouteGuards';
import { IntroAnimation } from './components/layout/IntroAnimation';
import { AnimatePresence } from 'framer-motion';

// Pages
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from './pages/LoginPage';
import { PredictPage } from './pages/PredictPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { EmployeeRecordsPage } from './pages/EmployeeRecordsPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { RegisterPage } from './pages/RegisterPage';

// Placeholder Pages (To be built next)
const Placeholder = ({ name }: { name: string }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-12 glass rounded-3xl border-dashed border-2 border-slate-700">
    <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-6">
       <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">{name} Module</h2>
    <p className="text-slate-400 text-center max-w-sm">This hyper-intelligent module is currently processing deep neural parameters. Expected activation: T-Minus 2 turns.</p>
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route 
              path="/dashboard" 
              element={<DashboardPage />} 
            />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/analytics" element={<Placeholder name="Advanced Analytics" />} />
            <Route path="/explain" element={<ExplainabilityPage />} />
            <Route path="/employees" element={<EmployeeRecordsPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/history" element={<PredictionHistoryPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/settings" element={<Placeholder name="System Settings" />} />
            <Route path="/notifications" element={<Placeholder name="Notification Center" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function MainApp() {
  const [showIntro, setShowIntro] = useState(true);
  const { user, isLoading } = useAuth();

  // Check if session intro has been seen
  useEffect(() => {
    const seen = sessionStorage.getItem('introSeen');
    if (seen) {
      setShowIntro(false);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('introSeen', 'true');
  };

  if (isLoading) return null;

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  return (
    <EmployeeProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </EmployeeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}