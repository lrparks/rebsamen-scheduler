import { useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { useTeams } from '../../hooks/useTeams.js';
import { formatDateISO } from '../../utils/dateHelpers.js';
import {
  getWeekEnd,
  getWeeklyComparison,
  getBookingTypeBreakdown,
  getRevenueForRange,
  getBookingEfficiency,
  getContractorHoursForRange,
  getTeamHoursForRange,
  formatCurrency,
} from '../../utils/reportUtils.js';

/**
 * Weekly Summary Report - Week over week comparison
 */
export default function WeeklySummary({ weekStart }) {
  const { bookings, loading } = useBookingsContext();
  const { contractors } = useContractors();
  const { teams } = useTeams();

  // Calculate date range
  const startDate = formatDateISO(weekStart);
  const endDate = formatDateISO(getWeekEnd(weekStart));

  // Calculate all metrics
  const comparison = useMemo(() =>
    getWeeklyComparison(bookings, weekStart),
    [bookings, weekStart]
  );

  const typeBreakdown = useMemo(() =>
    getBookingTypeBreakdown(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const revenue = useMemo(() =>
    getRevenueForRange(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const efficiency = useMemo(() =>
    getBookingEfficiency(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const topContractors = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, startDate, endDate),
    [bookings, contractors, startDate, endDate]
  );

  const topTeams = useMemo(() =>
    getTeamHoursForRange(bookings, teams, startDate, endDate),
    [bookings, teams, startDate, endDate]
  );

  // Get last week's contractor hours for comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = formatDateISO(lastWeekStart);
  const lastWeekEndStr = formatDateISO(getWeekEnd(lastWeekStart));

  const lastWeekContractors = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, lastWeekStartStr, lastWeekEndStr),
    [bookings, contractors, lastWeekStartStr, lastWeekEndStr]
  );

  const lastWeekTeams = useMemo(() =>
    getTeamHoursForRange(bookings, teams, lastWeekStartStr, lastWeekEndStr),
    [bookings, teams, lastWeekStartStr, lastWeekEndStr]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Print Header */}
      <div className="print-header hidden">
        <h1>Rebsamen Tennis Center - Weekly Summary</h1>
        <p>Week of {startDate} to {endDate}</p>
      </div>

      {/* Row 1: Utilization Summary & Booking Types (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UtilizationComparisonCard comparison={comparison} />
        <BookingTypesCard breakdown={typeBreakdown} />
      </div>

      {/* Row 2: Revenue & Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueCard revenue={revenue} />
        <EfficiencyCard efficiency={efficiency} />
      </div>

      {/* Row 3: Top Contractors & Top Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopContractorsCard
          contractors={topContractors}
          lastWeekContractors={lastWeekContractors}
        />
        <TopTeamsCard
          teams={topTeams}
          lastWeekTeams={lastWeekTeams}
        />
      </div>
    </div>
  );
}

/**
 * Utilization Comparison Card
 */
function UtilizationComparisonCard({ comparison }) {
  const metrics = [
    { key: 'overall', label: 'Overall' },
    { key: 'prime', label: 'Prime Time' },
    { key: 'nonPrime', label: 'Non-Prime' },
    { key: 'weekend', label: 'Weekend' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Utilization Summary</h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="pb-2"></th>
              <th className="pb-2 text-right">This Week</th>
              <th className="pb-2 text-right">Last Week</th>
              <th className="pb-2 text-right">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map(({ key, label }) => (
              <tr key={key}>
                <td className="py-2 text-sm text-gray-900">{label}</td>
                <td className="py-2 text-sm text-gray-900 text-right font-medium">
                  {comparison.thisWeek[key]}%
                </td>
                <td className="py-2 text-sm text-gray-600 text-right">
                  {comparison.lastWeek[key]}%
                </td>
                <td className="py-2 text-sm text-right">
                  <ChangeIndicator value={comparison.change[key]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Change indicator with color coding
 */
function ChangeIndicator({ value }) {
  if (value === 0) {
    return <span className="text-gray-500">—</span>;
  }

  const isPositive = value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const prefix = isPositive ? '+' : '';

  return (
    <span className={`font-medium ${color}`}>
      {prefix}{value}%
    </span>
  );
}

/**
 * Booking Types Breakdown Card
 */
function BookingTypesCard({ breakdown }) {
  const { breakdown: types, totalHours } = breakdown;

  // Sort by hours descending
  const sortedTypes = Object.entries(types)
    .filter(([_, data]) => data.hours > 0)
    .sort(([, a], [, b]) => b.hours - a.hours);

  const colors = {
    open: 'bg-blue-500',
    contractor: 'bg-purple-500',
    team: 'bg-orange-500',
    tournament: 'bg-red-500',
    maintenance: 'bg-gray-500',
    hold: 'bg-yellow-500',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">By Booking Type (hours)</h3>
      </div>
      <div className="p-4">
        {totalHours === 0 ? (
          <div className="text-sm text-gray-500">No bookings this week</div>
        ) : (
          <div className="space-y-3">
            {sortedTypes.map(([key, data]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{data.label}</span>
                  <span className="text-gray-900 font-medium">
                    {Math.round(data.hours)} hrs ({data.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colors[key] || 'bg-gray-400'}`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{Math.round(totalHours)} hours</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Revenue Card
 */
function RevenueCard({ revenue }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Revenue</h3>
      </div>
      <div className="p-4">
        {/* Total Revenue */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(revenue.total)}
          </div>
          <div className="text-sm text-gray-500">Total Revenue</div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Court Rentals</span>
            <span className="font-medium">{formatCurrency(revenue.byType.courtRentals)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Contractors</span>
            <span className="font-medium">{formatCurrency(revenue.byType.contractors)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">League/Team Fees</span>
            <span className="font-medium">{formatCurrency(revenue.byType.leagues)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tournament</span>
            <span className="font-medium">{formatCurrency(revenue.byType.tournaments)}</span>
          </div>
        </div>

        {/* Collection Status */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Collected</span>
            <span className="font-medium text-green-600">{formatCurrency(revenue.collected)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pending</span>
            <span className="font-medium text-amber-600">{formatCurrency(revenue.pending)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Booking Efficiency Card
 */
function EfficiencyCard({ efficiency }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Booking Efficiency</h3>
      </div>
      <div className="p-4">
        {efficiency.total === 0 ? (
          <div className="text-sm text-gray-500">No bookings this week</div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{efficiency.total}</div>
                <div className="text-sm text-gray-500">Total Bookings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{efficiency.completedRate}%</div>
                <div className="text-sm text-gray-500">Completion Rate</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">{efficiency.completed} ({efficiency.completedRate}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cancelled</span>
                <span className={`font-medium ${efficiency.cancelledRate > 10 ? 'text-red-600' : ''}`}>
                  {efficiency.cancelled} ({efficiency.cancelledRate}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">No-shows</span>
                <span className={`font-medium ${efficiency.noShowRate > 5 ? 'text-red-600' : ''}`}>
                  {efficiency.noShows} ({efficiency.noShowRate}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Check-in Rate</span>
                <span className="font-medium text-green-600">{efficiency.checkInRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top Contractors Card
 */
function TopContractorsCard({ contractors, lastWeekContractors }) {
  // Create lookup for last week's hours
  const lastWeekMap = new Map(
    lastWeekContractors.map(c => [c.id, c.totalHours])
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Top Contractors (hours)</h3>
      </div>
      <div className="p-4">
        {contractors.length === 0 ? (
          <div className="text-sm text-gray-500">No contractor bookings this week</div>
        ) : (
          <div className="space-y-3">
            {contractors.slice(0, 5).map((contractor, index) => {
              const lastWeekHours = lastWeekMap.get(contractor.id) || 0;
              const change = contractor.totalHours - lastWeekHours;

              return (
                <div key={contractor.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-gray-900">{contractor.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(contractor.totalHours)} hrs
                    </span>
                    {change !== 0 && (
                      <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{Math.round(change)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total Contractor Hours</span>
              <span>{Math.round(contractors.reduce((sum, c) => sum + c.totalHours, 0))} hrs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top Teams Card
 */
function TopTeamsCard({ teams, lastWeekTeams }) {
  // Create lookup for last week's hours
  const lastWeekMap = new Map(
    lastWeekTeams.map(t => [t.id, t.totalHours])
  );

  // Format team type for display
  const formatTeamType = (type) => {
    const typeMap = {
      'team_usta': 'USTA',
      'team_hs': 'HS',
      'team_college': 'College',
      'team_other': 'Other',
    };
    return typeMap[type] || '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Top Teams (hours)</h3>
      </div>
      <div className="p-4">
        {teams.length === 0 ? (
          <div className="text-sm text-gray-500">No team bookings this week</div>
        ) : (
          <div className="space-y-3">
            {teams.slice(0, 5).map((team, index) => {
              const lastWeekHours = lastWeekMap.get(team.id) || 0;
              const change = team.totalHours - lastWeekHours;

              return (
                <div key={team.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm text-gray-900">{team.name}</span>
                    {team.type && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {formatTeamType(team.type)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(team.totalHours)} hrs
                    </span>
                    {change !== 0 && (
                      <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change > 0 ? '+' : ''}{Math.round(change)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Total */}
            <div className="pt-3 border-t border-gray-200 flex justify-between text-sm font-medium">
              <span>Total Team Hours</span>
              <span>{Math.round(teams.reduce((sum, t) => sum + t.totalHours, 0))} hrs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
