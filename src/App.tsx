import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

// Layouts (not lazy — tiny files, always needed)
import AuthLayout from '@/layouts/AuthLayout';
import PlatformLayout from '@/layouts/PlatformLayout';
import CreateTenant from '@/pages/tenants/CreateTenant';
import TenantDetail from '@/pages/tenants/TenantDetail';

// Pages — lazy for code splitting
const Login = lazy(() => import('@/pages/auth/Login'));
const Overview = lazy(() => import('@/pages/dashboard/Overview'));

// Tenants
const TenantList = lazy(() => import('@/pages/tenants/TenantList'));

// Analytics
const Revenue = lazy(() => import('@/pages/analytics/Revenue'));
const TenantGrowth = lazy(() => import('@/pages/analytics/TenantGrowth'));
const Transactions = lazy(() => import('@/pages/analytics/Transactions'));

// Storefronts
const StorefrontList = lazy(() => import('@/pages/storefronts/StorefrontList'));
const GenerateStorefront = lazy(() => import('@/pages/storefronts/GenerateStorefront'));

// Settings
const PlatformSettings = lazy(() => import('@/pages/settings/PlatformSettings'));
const SystemHealth = lazy(() => import('@/pages/settings/SystemHealth'));

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected Platform Dashboard Routes */}
      <Route
        element={
          <ProtectedRoute>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/tenants" element={<TenantList />} />
        <Route path="/tenants/new" element={<CreateTenant />} />
        <Route path="/tenants/:id" element={<TenantDetail />} />
        <Route path="/analytics/revenue" element={<Revenue />} />
        <Route path="/analytics/tenants" element={<TenantGrowth />} />
        <Route path="/analytics/transactions" element={<Transactions />} />
        <Route path="/storefronts" element={<StorefrontList />} />
        <Route path="/storefronts/generate" element={<GenerateStorefront />} />
        <Route path="/settings" element={<PlatformSettings />} />
        <Route path="/settings/health" element={<SystemHealth />} />
        <Route path="/*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
    </Suspense>
  );
}
