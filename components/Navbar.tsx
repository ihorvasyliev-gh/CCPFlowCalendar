import React from 'react';
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
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${theme === 'dark' ? 'glass-panel-dark text-white' : 'glass-panel text-slate-800'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section - Minimalist */}
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 btn-hover-effect">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight leading-none text-slate-900 dark:text-white">CCP Events</span>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end pr-4 mr-2 border-r border-slate-200 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.fullName}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{user.role}</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationCenter userId={user.id} />

              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all btn-hover-effect rounded-lg"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              {onExportClick && (
                <button
                  onClick={onExportClick}
                  className="hidden sm:flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 btn-hover-effect text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              )}

              {user.role === UserRole.ADMIN && (
                <button
                  onClick={onAddEventClick}
                  className="hidden sm:flex items-center space-x-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-medium btn-hover-effect"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Event</span>
                </button>
              )}

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

              <button
                onClick={onLogout}
                className="group flex items-center gap-2 p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg btn-hover-effect"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
