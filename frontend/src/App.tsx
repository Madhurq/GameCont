
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar/Navbar';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './components/Toast/Toast';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateServer } from './pages/CreateServer';
import { ServerDetail } from './pages/ServerDetail';
import { EditServer } from './pages/EditServer';
import { FileManager } from './pages/FileManager';
import { Friends } from './pages/Friends';

// Hydrate auth store on startup
useAuthStore.getState().hydrate();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/servers/create" element={<CreateServer />} />
          <Route path="/servers/:id" element={<ServerDetail />} />
          <Route path="/servers/:id/edit" element={<EditServer />} />
          <Route path="/servers/:id/files" element={<FileManager />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/login"
                element={
                  <GuestGuard>
                    <Login />
                  </GuestGuard>
                }
              />
              <Route
                path="/register"
                element={
                  <GuestGuard>
                    <Register />
                  </GuestGuard>
                }
              />
              <Route
                path="/*"
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
