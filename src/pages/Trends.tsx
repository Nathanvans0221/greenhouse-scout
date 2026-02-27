import { useState, useMemo } from 'react';
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWithinInterval,
} from 'date-fns';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { TimeRange, PestType, TrendDataPoint } from '../types';
import { PEST_LABELS, PEST_COLORS } from '../types';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const ALL_PEST_TYPES: PestType[] = [
  'whitefly', 'thrips', 'fungus_gnat', 'shore_fly', 'aphid', 'leafminer', 'other',
];

export default function Trends() {
  const scans = useAppStore((s) => s.scans);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [hiddenPests, setHiddenPests] = useState<Set<PestType>>(new Set());

  const togglePest = (pest: PestType) => {
    setHiddenPests((prev) => {
      const next = new Set(prev);
      if (next.has(pest)) {
        next.delete(pest);
      } else {
        next.add(pest);
      }
      return next;
    });
  };

  const { chartData, stats } = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let buckets: Date[];
    let labelFormat: string;

    switch (timeRange) {
      case 'day':
        startDate = subDays(now, 7);
        buckets = eachDayOfInterval({ start: startDate, end: now });
        labelFormat = 'EEE';
        break;
      case 'week':
        startDate = subWeeks(now, 8);
        buckets = eachWeekOfInterval({ start: startDate, end: now }, { weekStartsOn: 1 });
        labelFormat = 'M/d';
        break;
      case 'month':
        startDate = subMonths(now, 12);
        buckets = eachMonthOfInterval({ start: startDate, end: now });
        labelFormat = 'MMM';
        break;
      case 'year':
        startDate = subYears(now, 3);
        buckets = eachMonthOfInterval({ start: startDate, end: now });
        labelFormat = "MMM ''yy";
        break;
    }

    const filteredScans = scans.filter((s) => {
      const d = new Date(s.timestamp);
      return d >= startDate && d <= now;
    });

    const data: TrendDataPoint[] = buckets.map((bucketStart, i) => {
      let bucketEnd: Date;
      if (i < buckets.length - 1) {
        bucketEnd = buckets[i + 1];
      } else {
        switch (timeRange) {
          case 'day':
            bucketEnd = startOfDay(subDays(bucketStart, -1));
            break;
          case 'week':
            bucketEnd = startOfWeek(subWeeks(bucketStart, -1), { weekStartsOn: 1 });
            break;
          case 'month':
          case 'year':
            bucketEnd = startOfMonth(subMonths(bucketStart, -1));
            break;
        }
      }

      const bucketScans = filteredScans.filter((s) => {
        const d = new Date(s.timestamp);
        return isWithinInterval(d, { start: bucketStart, end: bucketEnd });
      });

      const counts: Record<PestType, number> = {
        whitefly: 0, thrips: 0, fungus_gnat: 0,
        shore_fly: 0, aphid: 0, leafminer: 0, other: 0,
      };

      for (const scan of bucketScans) {
        for (const pest of scan.pests) {
          counts[pest.type] += pest.count;
        }
      }

      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      return {
        date: bucketStart.toISOString(),
        label: format(bucketStart, labelFormat),
        ...counts,
        total,
      };
    });

    const totalScansInPeriod = filteredScans.length;
    const totalPests = filteredScans.reduce((sum, s) => sum + s.totalCount, 0);
    const avgPests = totalScansInPeriod > 0 ? Math.round(totalPests / totalScansInPeriod) : 0;
    const highestSingle = filteredScans.reduce(
      (max, s) => Math.max(max, s.totalCount),
      0,
    );

    return {
      chartData: data,
      stats: {
        totalScans: totalScansInPeriod,
        avgPests,
        highestSingle,
      },
    };
  }, [scans, timeRange]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={22} className="text-green-600" />
        <h1 className="text-xl font-bold text-gray-900">Trends</h1>
      </div>

      {/* Time Range Tabs */}
      <div className="flex bg-white rounded-2xl shadow-sm p-1 mb-6">
        {TIME_RANGES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTimeRange(key)}
            className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
              timeRange === key
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        {scans.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center">
            <BarChart3 size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No scan data yet</p>
            <p className="text-xs text-gray-400 mt-1">Charts will appear after your first scan</p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
                {ALL_PEST_TYPES.filter((t) => !hiddenPests.has(t)).map((pestType) => (
                  <Line
                    key={pestType}
                    type="monotone"
                    dataKey={pestType}
                    name={PEST_LABELS[pestType]}
                    stroke={PEST_COLORS[pestType]}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: PEST_COLORS[pestType] }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Species Filter Toggles */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter Species</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_PEST_TYPES.map((pestType) => {
            const isHidden = hiddenPests.has(pestType);
            return (
              <button
                key={pestType}
                onClick={() => togglePest(pestType)}
                className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                  isHidden
                    ? 'border-gray-200 bg-white text-gray-400'
                    : 'border-transparent text-white'
                }`}
                style={
                  isHidden
                    ? undefined
                    : { backgroundColor: PEST_COLORS[pestType] }
                }
              >
                {isHidden ? (
                  <EyeOff size={12} />
                ) : (
                  <Eye size={12} />
                )}
                {PEST_LABELS[pestType]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.totalScans}</p>
          <p className="text-xs text-gray-500 mt-0.5">Scans</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.avgPests}</p>
          <p className="text-xs text-gray-500 mt-0.5">Avg / Scan</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.highestSingle}</p>
          <p className="text-xs text-gray-500 mt-0.5">Peak Count</p>
        </div>
      </div>
    </div>
  );
}
