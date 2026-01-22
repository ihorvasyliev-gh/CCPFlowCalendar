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
        <div className="flex justify-between h-20 items-center">
          {/* Logo Section */}
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
              <div className="relative bg-gradient-to-br from-brand-500 to-violet-600 p-2.5 rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <span className="block font-display font-bold text-xl tracking-tight leading-none">CCP Events</span>
              <span className="block text-[10px] text-brand-600 font-semibold tracking-wider uppercase">Partnership Portal</span>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end border-r border-slate-200 dark:border-slate-700 pr-4 mr-2">
              <span className="text-sm font-semibold">{user.fullName}</span>
              <span className="text-xs text-brand-500 font-bold uppercase tracking-wider">{user.role}</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationCenter userId={user.id} />

              <button
                onClick={toggleTheme}
                className="p-2.5 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition-all rounded-xl hover:bg-brand-50 dark:hover:bg-slate-800/50"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>

              {onExportClick && (
                <button
                  onClick={onExportClick}
                  className="hidden sm:flex items-center space-x-2 text-slate-600 hover:text-brand-600 font-medium px-4 py-2 rounded-xl transition-all hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              )}

              {user.role === UserRole.ADMIN && (
                <button
                  onClick={onAddEventClick}
                  className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Event</span>
                </button>
              )}

              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

              <button
                onClick={onLogout}
                className="group flex items-center gap-2 p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
