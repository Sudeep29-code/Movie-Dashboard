import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0d12] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user is authenticated and on dashboard view (or default if logged in)
  if (user && view === 'dashboard') {
    switch (user.role) {
      case 'student':
        return <StudentDashboard onLogout={() => { logout(); setView('landing'); }} />;
      case 'teacher':
        return <TeacherDashboard onLogout={() => { logout(); setView('landing'); }} />;
      case 'admin':
        return <AdminDashboard onLogout={() => { logout(); setView('landing'); }} />;
      case 'super_admin':
        return <SuperAdminDashboard onLogout={() => { logout(); setView('landing'); }} />;
      default:
        return (
          <div className="min-h-screen bg-[#0c0d12] text-white flex flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-bold">Unauthorized Role</h2>
            <button
              onClick={() => { logout(); setView('landing'); }}
              className="px-4 py-2 rounded bg-red-600 text-xs font-bold"
            >
              Sign Out
            </button>
          </div>
        );
    }
  }

  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => setView('landing')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }

  return (
    <LandingPage
      onGoLogin={() => (user ? setView('dashboard') : setView('login'))}
      onGoBooking={() => (user ? setView('dashboard') : setView('login'))}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
