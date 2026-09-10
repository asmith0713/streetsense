import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminToken } from '../api';

export default function ProtectedAdminRoute({ children }) {
  // Convenience only - the API verifies the admin token on every request.
  const isAuthorized = !!getAdminToken();

  // If not authorized, redirect to home page (no hints about admin login)
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}
