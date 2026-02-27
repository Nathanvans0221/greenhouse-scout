import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, MapPin, BarChart3, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import Traps from './pages/Traps';
import Trends from './pages/Trends';
import SettingsPage from './pages/Settings';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/scan', icon: Camera, label: 'Scan' },
  { to: '/traps', icon: MapPin, label: 'Traps' },
  { to: '/trends', icon: BarChart3, label: 'Trends' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-full bg-[#f5f5f0] flex flex-col">
      <main className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/traps" element={<Traps />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around h-14">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center w-full h-14 gap-0.5 transition-colors"
              >
                <div
                  className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                    isActive ? 'bg-green-600/15' : ''
                  }`}
                >
                  <Icon
                    size={22}
                    className={
                      isActive
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
