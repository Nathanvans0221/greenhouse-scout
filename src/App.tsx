import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { Home, Camera, MapPin, BarChart3, Layers } from 'lucide-react';

import Header from './components/Header';
import Drawer from './components/Drawer';
import { useModeStore } from './store/useModeStore';
import { useAppStore } from './store/useAppStore';
import { useGermStore } from './store/useGermStore';

// Scout pages
import ScoutDashboard from './pages/scout/Dashboard';
import ScoutScan from './pages/scout/Scan';
import ScoutTraps from './pages/scout/Traps';
import ScoutTrends from './pages/scout/Trends';

// Germ pages
import GermDashboard from './pages/germ/Dashboard';
import GermScan from './pages/germ/Scan';
import GermLots from './pages/germ/Lots';
import GermTrends from './pages/germ/Trends';

// Shared pages
import SettingsPage from './pages/Settings';

const scoutNavItems = [
  { to: '/scout', icon: Home, label: 'Home' },
  { to: '/scout/scan', icon: Camera, label: 'Scan' },
  { to: '/scout/traps', icon: MapPin, label: 'Traps' },
  { to: '/scout/trends', icon: BarChart3, label: 'Trends' },
] as const;

const germNavItems = [
  { to: '/germ', icon: Home, label: 'Home' },
  { to: '/germ/scan', icon: Camera, label: 'Scan' },
  { to: '/germ/lots', icon: Layers, label: 'Lots' },
  { to: '/germ/trends', icon: BarChart3, label: 'Trends' },
] as const;

export default function App() {
  const location = useLocation();
  const activeMode = useModeStore((s) => s.activeMode);
  const setMode = useModeStore((s) => s.setMode);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const appLoaded = useAppStore((s) => s.loaded);
  const germLoaded = useGermStore((s) => s.loaded);
  const loadAppData = useAppStore((s) => s.loadFromDb);
  const loadGermData = useGermStore((s) => s.loadFromDb);

  // Load data from Supabase on mount
  useEffect(() => {
    loadAppData();
    loadGermData();
  }, [loadAppData, loadGermData]);

  // Sync mode based on current URL path
  useEffect(() => {
    if (location.pathname.startsWith('/scout')) {
      if (activeMode !== 'scout') setMode('scout');
    } else if (location.pathname.startsWith('/germ')) {
      if (activeMode !== 'germ') setMode('germ');
    }
  }, [location.pathname, activeMode, setMode]);

  const navItems = activeMode === 'scout' ? scoutNavItems : germNavItems;
  const accentColor = activeMode === 'scout' ? 'green' : 'amber';

  // Show bottom nav on tool pages, but not on /settings
  const showBottomNav = !location.pathname.startsWith('/settings');

  if (!appLoaded || !germLoaded) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f5f5f0] flex flex-col">
      <Header onMenuClick={() => setDrawerOpen(true)} />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 pt-14 pb-24">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/scout" replace />} />

          {/* Scout routes */}
          <Route path="/scout" element={<ScoutDashboard />} />
          <Route path="/scout/scan" element={<ScoutScan />} />
          <Route path="/scout/traps" element={<ScoutTraps />} />
          <Route path="/scout/trends" element={<ScoutTrends />} />

          {/* Germ routes */}
          <Route path="/germ" element={<GermDashboard />} />
          <Route path="/germ/scan" element={<GermScan />} />
          <Route path="/germ/lots" element={<GermLots />} />
          <Route path="/germ/trends" element={<GermTrends />} />

          {/* Shared routes */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/scout" replace />} />
        </Routes>
      </main>

      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-lg mx-auto flex items-center justify-around h-14">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive =
                to === '/scout' || to === '/germ'
                  ? location.pathname === to
                  : location.pathname.startsWith(to);

              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center w-full h-14 gap-0.5 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                      isActive
                        ? accentColor === 'green'
                          ? 'bg-green-600/15'
                          : 'bg-amber-500/15'
                        : ''
                    }`}
                  >
                    <Icon
                      size={22}
                      className={
                        isActive
                          ? accentColor === 'green'
                            ? 'text-green-600'
                            : 'text-amber-500'
                          : 'text-gray-400'
                      }
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isActive
                        ? accentColor === 'green'
                          ? 'text-green-600'
                          : 'text-amber-500'
                        : 'text-gray-400'
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
      )}
    </div>
  );
}
