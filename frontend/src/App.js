import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { Search } from './components/Search';
import { Notifications } from './components/Notifications';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [activeTab, setActiveTab] = useState('feed');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'feed':
        return <Feed />;
      case 'search':
        return <Search />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Feed />;
    }
  };

  return (
    <AuthProvider>
      <div className="App">
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          {renderActiveTab()}
        </Layout>
        
        {/* Toast уведомления */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
            },
            success: {
              iconTheme: {
                primary: '#34c759',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff3b30',
                secondary: 'white',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
