/**
 * Main Layout Component
 * Provides sidebar navigation and header
 */

import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink: React.FC<{
  to: string;
  icon: string;
  label: string;
  isActive: boolean;
}> = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isFirebaseEnabled } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">VAT OS</h1>
          <p className="text-xs text-gray-500 mt-1">Cross-border Compliance</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/dashboard" icon="📊" label="Dashboard" isActive={isActive('/dashboard')} />
          <NavLink
            to="/transactions"
            icon="📝"
            label="Transactions"
            isActive={isActive('/transactions')}
          />
          <NavLink
            to="/calculator"
            icon="🧮"
            label="Calculator"
            isActive={isActive('/calculator')}
          />
          <NavLink to="/filing" icon="📋" label="OSS Return" isActive={isActive('/filing')} />
          <NavLink to="/settings" icon="⚙️" label="Settings" isActive={isActive('/settings')} />
        </nav>

        {/* Firebase Status Badge */}
        <div className="p-4 border-t border-gray-200">
          <div
            className={`text-xs px-3 py-2 rounded-full text-center font-medium ${
              isFirebaseEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isFirebaseEnabled ? '☁️ Cloud' : '💾 Local (Demo)'}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {user && (
            <>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h2 className="text-gray-900 font-semibold"></h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
};
