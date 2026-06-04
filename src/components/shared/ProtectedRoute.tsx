import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformAuthStore } from '@/store/platformAuthStore';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = usePlatformAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
