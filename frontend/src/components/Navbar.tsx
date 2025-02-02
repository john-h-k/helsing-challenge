import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'dashboard';

  return (
    <nav className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[2000px] mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md"></div>
                <svg className="relative w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent tracking-wide">
                Cascade
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6 ml-8">
              <NavLink to="/dashboard" active={currentPath === 'dashboard'}>
                Dashboard
              </NavLink>
              <NavLink to="/analytics" active={currentPath === 'analytics'}>
                Analytics
              </NavLink>
            </div>
          </div>

          {/* Profile Button */}
          <button className="flex items-center space-x-3 px-3 py-2 rounded-full transition-all hover:bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-500 flex items-center justify-center text-white font-semibold">
              A
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white">Arrow Electronics</p>
              <p className="text-xs text-gray-400">Client</p>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ 
  children, 
  active = false,
  to
}: { 
  children: React.ReactNode; 
  active?: boolean;
  to: string;
}) => (
  <Link
    to={to}
    className={`text-sm font-medium transition-colors ${
      active 
        ? 'text-white' 
        : 'text-gray-400 hover:text-white'
    }`}
  >
    {children}
  </Link>
);

const NavButton = ({ children }: { children: React.ReactNode }) => (
  <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
    {children}
  </button>
);

export default Navbar;
