import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ children }) {
  const isAuthorized = !!sessionStorage.getItem('streetsense_admin_pwd');

  // If not authorized, redirect to home page (no hints about admin login)
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}
