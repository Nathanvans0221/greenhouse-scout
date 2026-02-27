import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, startOfWeek, subWeeks, isAfter } from 'date-fns';
import { Camera, Bug, AlertTriangle, Radio, TrendingUp, MapPin } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '../store/useAppStore';
import type { AlertLevel } from '../types';
import { ALERT_COLORS, ALERT_LABELS } from '../types';

const ALERT_PRIORITY: Record<AlertLevel, number> = {
  safe: 0,
  watch: 1,
  action: 2,
  critical: 3,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const traps = useAppStore((s) => s.traps);
  const scans = useAppStore((s) => s.scans);
  const getRecentScans = useAppStore((s) => s.getRecentScans);

  const recentScans = getRecentScans(5);

  const highestAlert = useMemo(() => {
    let highest: AlertLevel = 'safe';
    for (const trap of traps) {
      if (ALERT_PRIORITY[trap.alertLevel] > ALERT_PRIORITY[highest]) {
        highest = trap.alertLevel;
      }
    }
    return highest;
  }, [traps]);

  const scansThisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return scans.filter((s) => isAfter(new Date(s.timestamp), weekStart)).length;
  }, [scans]);

  const activeAlerts = useMemo(
    () => traps.filter((t) => t.alertLevel !== 'safe').length,
    [traps],
  );

  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const points: { label: string; total: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
      const weekScans = scans.filter((s) => {
        const d = new Date(s.timestamp);
        return d >= weekStart && d < weekEnd;
      });
      const total = weekScans.reduce((sum, s) => sum + s.totalCount, 0);
      points.push({
        label: format(weekStart, 'M/d'),
        total,
      });
    }
    return points;
  }, [scans]);

  const getTrapName = (trapId: string) => {
    const trap = traps.find((t) => t.id === trapId);
    return trap?.name ?? 'Unknown Trap';
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ScoutCard</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
          <Bug size={20} className="text-white" />
        </div>
      </div>

      {/* Alert Banner */}
      {highestAlert !== 'safe' && (
        <button
          onClick={() => navigate('/traps')}
          className="w-full mb-4 p-4 rounded-2xl flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: ALERT_COLORS[highestAlert] + '18' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: ALERT_COLORS[highestAlert] + '30' }}
          >
            <AlertTriangle
              size={20}
              style={{ color: ALERT_COLORS[highestAlert] }}
            />
          </div>
          <div className="text-left">
            <p
              className="text-sm font-semibold"
              style={{ color: ALERT_COLORS[highestAlert] }}
            >
              {ALERT_LABELS[highestAlert]}
            </p>
            <p className="text-xs text-gray-600">
              {activeAlerts} trap{activeAlerts !== 1 ? 's' : ''} need{activeAlerts === 1 ? 's' : ''} attention
            </p>
          </div>
        </button>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
            <MapPin size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{traps.length}</p>
          <p className="text-xs text-gray-500">Traps</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
            <Camera size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{scansThisWeek}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-2">
            <Radio size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeAlerts}</p>
          <p className="text-xs text-gray-500">Alerts</p>
        </div>
      </div>

      {/* Trend Mini Chart */}
      {scans.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-green-600" />
            <h2 className="text-sm font-semibold text-gray-900">8-Week Trend</h2>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: 12,
                  }}
                  formatter={(value) => [String(value ?? 0), 'Total Pests']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#16a34a' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Scans */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Scans</h2>
        {recentScans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Camera size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No scans yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Tap the button below to scan your first trap
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
              >
                {scan.imageData ? (
                  <img
                    src={scan.imageData}
                    alt="Scan"
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <Camera size={18} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getTrapName(scan.trapId)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(scan.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {scan.totalCount}
                  </p>
                  <p className="text-xs text-gray-500">pests</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan FAB */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none z-40">
        <button
          onClick={() => navigate('/scan')}
          className="pointer-events-auto flex items-center gap-2 h-14 px-8 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-full shadow-lg shadow-green-600/30 transition-all active:scale-95"
        >
          <Camera size={22} />
          <span>Scan a Trap</span>
        </button>
      </div>
    </div>
  );
}
