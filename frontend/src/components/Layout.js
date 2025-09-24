import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavTabs } from './NavTabs';
import { LoadingScreen } from './LoadingScreen';
import { LoginScreen } from './LoginScreen';

export const Layout = ({ children, activeTab, onTabChange }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <NavTabs activeTab={activeTab} onTabChange={onTabChange} user={user} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
