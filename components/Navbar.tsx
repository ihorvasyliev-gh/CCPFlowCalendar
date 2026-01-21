import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { LogOut, Calendar, PlusCircle, Download, Moon, Sun } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onAddEventClick: () => void;
  onExportClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onAddEventClick, onExportClick }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">CCP Events</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{user.fullName}</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider">{user.role}</span>
            </div>

            <NotificationCenter userId={user.id} />

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-300 hover:text-white transition-colors rounded-full hover:bg-slate-800"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {onExportClick && (
              <button
                onClick={onExportClick}
                className="flex items-center space-x-2 text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-800"
                title="Export Events"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {user.role === UserRole.ADMIN && (
              <button
                onClick={onAddEventClick}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
