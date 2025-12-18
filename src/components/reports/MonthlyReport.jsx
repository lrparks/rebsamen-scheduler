import { useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useContractors } from '../../hooks/useContractors.js';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useConfig } from '../../hooks/useConfig.js';
import { formatDateISO } from '../../utils/dateHelpers.js';
import {
  getMonthEnd,
  getMonthlyComparison,
  getYearOverYearComparison,
  getRevenueForRange,
  getBookingEfficiency,
  getContractorHoursForRange,
  getParticipationMetrics,
  getTotalCourtHours,
  getRevenuePerCourtHour,
  getWaivedValue,
  getTournamentMetrics,
  getYTDRange,
  getCancellationBreakdown,
  getBookingTypeBreakdown,
  formatCurrency,
  TIME_PERIODS,
  getTotalSlotsForPeriod,
} from '../../utils/reportUtils.js';
import { parseTimeToMinutes } from '../../utils/timeUtils.js';

/**
 * Monthly Performance Report - Board-level reporting
 */
export default function MonthlyReport({ monthStart }) {
  const { bookings, loading } = useBookingsContext();
  const { contractors } = useContractors();
  const { tournaments } = useTournaments();
  const { getConfigValue } = useConfig();

  // Date calculations
  const startDate = formatDateISO(monthStart);
  const endDate = formatDateISO(getMonthEnd(monthStart));
  const ytdRange = getYTDRange(monthStart);

  // Config values
  const revenueTarget = parseFloat(getConfigValue('monthly_revenue_target')) || 0;
  const utilizationTarget = parseFloat(getConfigValue('utilization_target_overall')) || 0;
  const primeUtilizationTarget = parseFloat(getConfigValue('utilization_target_prime')) || 0;
  const operatingExpenses = parseFloat(getConfigValue('operating_expenses')) || 0;

  // Month name for display
  const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Core metrics
  const comparison = useMemo(() =>
    getMonthlyComparison(bookings, monthStart),
    [bookings, monthStart]
  );

  const yoyComparison = useMemo(() =>
    getYearOverYearComparison(bookings, monthStart),
    [bookings, monthStart]
  );

  const revenue = useMemo(() =>
    getRevenueForRange(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const efficiency = useMemo(() =>
    getBookingEfficiency(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const cancellations = useMemo(() =>
    getCancellationBreakdown(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const contractorData = useMemo(() =>
    getContractorHoursForRange(bookings, contractors, startDate, endDate),
    [bookings, contractors, startDate, endDate]
  );

  const participation = useMemo(() =>
    getParticipationMetrics(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const courtHours = useMemo(() =>
    getTotalCourtHours(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const waivedValue = useMemo(() =>
    getWaivedValue(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  const tournamentMetrics = useMemo(() =>
    getTournamentMetrics(bookings, tournaments, startDate, endDate),
    [bookings, tournaments, startDate, endDate]
  );

  const ytdTournamentMetrics = useMemo(() =>
    getTournamentMetrics(bookings, tournaments, ytdRange.start, ytdRange.end),
    [bookings, tournaments, ytdRange.start, ytdRange.end]
  );

  const typeBreakdown = useMemo(() =>
    getBookingTypeBreakdown(bookings, startDate, endDate),
    [bookings, startDate, endDate]
  );

  // Utilization by time period
  const utilizationByPeriod = useMemo(() => {
    const monthBookings = bookings.filter(b =>
      b.date >= startDate &&
      b.date <= endDate &&
      b.status !== 'cancelled'
    );

    // Days in month
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

    const periodStats = {};
    Object.keys(TIME_PERIODS).forEach(periodKey => {
      const period = TIME_PERIODS[periodKey];
      const totalSlots = getTotalSlotsForPeriod(periodKey) * daysInMonth;

      // Calculate booked hours in this period
      let bookedHours = 0;
      monthBookings.forEach(b => {
        const bookingStart = parseTimeToMinutes(b.time_start);
        const bookingEnd = parseTimeToMinutes(b.time_end);
        const periodStart = parseTimeToMinutes(period.start);
        const periodEnd = parseTimeToMinutes(period.end);

        const overlapStart = Math.max(bookingStart, periodStart);
        const overlapEnd = Math.min(bookingEnd, periodEnd);
        if (overlapStart < overlapEnd) {
          bookedHours += (overlapEnd - overlapStart) / 60;
        }
      });

      periodStats[periodKey] = {
        label: period.label,
        booked: Math.round(bookedHours),
        total: totalSlots,
        utilization: totalSlots > 0 ? Math.round((bookedHours / totalSlots) * 100) : 0,
      };
    });

    return periodStats;
  }, [bookings, startDate, endDate, monthStart]);

  // Cost recovery calculation
  const costRecovery = operatingExpenses > 0
    ? Math.round((revenue.total / operatingExpenses) * 100)
    : null;

  // Revenue per court hour
  const revenuePerHour = getRevenuePerCourtHour(revenue.total, courtHours);

  // Total contractor hours and percentage
  const totalContractorHours = contractorData.reduce((sum, c) => sum + c.totalHours, 0);
  const contractorPercentage = courtHours > 0
    ? Math.round((totalContractorHours / courtHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 monthly-report">
      {/* Print Header */}
      <div className="print-header hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Rebsamen Tennis Center</h1>
        <h2 className="text-xl">Monthly Performance Report - {monthName}</h2>
        <p className="text-sm text-gray-600">Generated {new Date().toLocaleDateString()}</p>
      </div>

      {/* Section 1: Executive Summary */}
      <ExecutiveSummaryCard
        courtHours={courtHours}
        revenue={revenue.total}
        revenueTarget={revenueTarget}
        costRecovery={costRecovery}
        comparison={comparison}
        yoyComparison={yoyComparison}
      />

      {/* Section 2 & 3: Utilization and Financial (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UtilizationCard
          utilizationByPeriod={utilizationByPeriod}
          overallUtilization={comparison.thisMonth.utilization}
          utilizationTarget={utilizationTarget}
          primeUtilizationTarget={primeUtilizationTarget}
        />
        <FinancialCard
          revenue={revenue}
          revenuePerHour={revenuePerHour}
          waivedValue={waivedValue}
          typeBreakdown={typeBreakdown}
        />
      </div>

      {/* Section 4 & 5: Participation and Booking Patterns (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParticipationCard participation={participation} />
        <BookingPatternsCard
          efficiency={efficiency}
          cancellations={cancellations}
        />
      </div>

      {/* Section 6: Contractor Utilization */}
      <ContractorCard
        contractorData={contractorData}
        totalContractorHours={totalContractorHours}
        totalCourtHours={courtHours}
        contractorPercentage={contractorPercentage}
      />

      {/* Section 7: Tournaments & Events */}
      <TournamentsCard
        monthMetrics={tournamentMetrics}
        ytdMetrics={ytdTournamentMetrics}
        monthName={monthName}
      />
    </div>
  );
}

/**
 * Executive Summary Card
 */
function ExecutiveSummaryCard({ courtHours, revenue, revenueTarget, costRecovery, comparison, yoyComparison }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Executive Summary</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Court Hours */}
          <div>
            <div className="text-3xl font-bold text-gray-900">{Math.round(courtHours)}</div>
            <div className="text-sm text-gray-500">Court Hours Booked</div>
            <div className="mt-2 space-y-1 text-sm">
              <ComparisonLine
                label="vs Last Month"
                value={comparison.change.hours}
                suffix=" hrs"
              />
              {yoyComparison.hasLastYearData && (
                <ComparisonLine
                  label="vs Last Year"
                  value={yoyComparison.change.hours}
                  suffix=" hrs"
                  showPercent={yoyComparison.change.hoursPercent}
                />
              )}
            </div>
          </div>

          {/* Revenue */}
          <div>
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(revenue)}</div>
            <div className="text-sm text-gray-500">Total Revenue</div>
            {revenueTarget > 0 && (
              <div className="mt-1">
                <TargetProgress current={revenue} target={revenueTarget} />
              </div>
            )}
            <div className="mt-2 space-y-1 text-sm">
              <ComparisonLine
                label="vs Last Month"
                value={comparison.change.revenue}
                isCurrency
              />
              {yoyComparison.hasLastYearData && (
                <ComparisonLine
                  label="vs Last Year"
                  value={yoyComparison.change.revenue}
                  isCurrency
                  showPercent={yoyComparison.change.revenuePercent}
                />
              )}
            </div>
          </div>

          {/* Cost Recovery */}
          <div>
            {costRecovery !== null ? (
              <>
                <div className="text-3xl font-bold text-gray-900">{costRecovery}%</div>
                <div className="text-sm text-gray-500">Cost Recovery</div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${costRecovery >= 100 ? 'bg-green-500' : costRecovery >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(costRecovery, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {costRecovery >= 100 ? 'Target met' : `${100 - costRecovery}% to break even`}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-gray-400">--</div>
                <div className="text-sm text-gray-500">Cost Recovery</div>
                <div className="text-xs text-gray-400 mt-2">
                  Set operating_expenses in config
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Utilization Card
 */
function UtilizationCard({ utilizationByPeriod, overallUtilization, utilizationTarget, primeUtilizationTarget }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Utilization Metrics</h3>
      </div>
      <div className="p-4">
        {/* Overall */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-gray-900">{overallUtilization}%</div>
              <div className="text-sm text-gray-500">Overall Utilization</div>
            </div>
            {utilizationTarget > 0 && (
              <div className="text-right">
                <span className={`text-sm font-medium ${overallUtilization >= utilizationTarget ? 'text-green-600' : 'text-amber-600'}`}>
                  Target: {utilizationTarget}%
                </span>
              </div>
            )}
          </div>
          {utilizationTarget > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${overallUtilization >= utilizationTarget ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min((overallUtilization / utilizationTarget) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* By Time Period */}
        <div className="space-y-3">
          {Object.entries(utilizationByPeriod).map(([key, data]) => {
            const target = key === 'PRIME' ? primeUtilizationTarget : null;
            return (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{data.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{data.booked} / {data.total} hrs</span>
                  <span className={`text-sm font-medium w-12 text-right ${
                    target && data.utilization >= target ? 'text-green-600' :
                    target && data.utilization < target ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {data.utilization}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Financial Metrics Card
 */
function FinancialCard({ revenue, revenuePerHour, waivedValue, typeBreakdown }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Financial Metrics</h3>
      </div>
      <div className="p-4">
        {/* Revenue per hour */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(revenuePerHour)}</div>
              <div className="text-sm text-gray-500">Revenue per Court Hour</div>
            </div>
          </div>
        </div>

        {/* Revenue by source */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase">Revenue by Source</div>
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

        {/* Waived Value */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Waived Value</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Count</span>
            <span className="font-medium">{waivedValue.count} bookings</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Hours</span>
            <span className="font-medium">{Math.round(waivedValue.hours)} hrs</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Value</span>
            <span className="font-medium text-amber-600">{formatCurrency(waivedValue.value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Participation Card
 */
function ParticipationCard({ participation }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Participation Metrics</h3>
      </div>
      <div className="p-4">
        {participation.total === 0 ? (
          <div className="text-sm text-gray-500">No participation data this month</div>
        ) : (
          <>
            {/* Total */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{participation.total}</div>
              <div className="text-sm text-gray-500">Total Participants</div>
            </div>

            {/* Adult vs Youth */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xl font-bold text-gray-900">{participation.adults}</div>
                <div className="text-sm text-gray-500">Adults</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{participation.youth}</div>
                <div className="text-sm text-gray-500">Youth (under 18)</div>
              </div>
            </div>

            {/* Youth percentage bar */}
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{ width: `${participation.youthPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {participation.youthPercentage}% youth participation
              </div>
            </div>

            {/* Average per booking */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg per booking</span>
                <span className="font-medium">{participation.avgPerBooking} players</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Total bookings</span>
                <span className="font-medium">{participation.bookingCount}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Booking Patterns Card
 */
function BookingPatternsCard({ efficiency, cancellations }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Booking Patterns</h3>
      </div>
      <div className="p-4">
        {efficiency.total === 0 ? (
          <div className="text-sm text-gray-500">No bookings this month</div>
        ) : (
          <>
            {/* Efficiency metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{efficiency.completedRate}%</div>
                <div className="text-xs text-gray-500">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${efficiency.cancelledRate > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                  {efficiency.cancelledRate}%
                </div>
                <div className="text-xs text-gray-500">Cancellation Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${efficiency.noShowRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                  {efficiency.noShowRate}%
                </div>
                <div className="text-xs text-gray-500">No-Show Rate</div>
              </div>
            </div>

            {/* Cancellation breakdown */}
            {cancellations.total > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Cancellation Reasons ({cancellations.total} total)
                </div>
                <div className="space-y-1">
                  {cancellations.byReason.weather > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Weather</span>
                      <span className="font-medium">{cancellations.byReason.weather}</span>
                    </div>
                  )}
                  {cancellations.byReason.customer > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customer Request</span>
                      <span className="font-medium">{cancellations.byReason.customer}</span>
                    </div>
                  )}
                  {cancellations.byReason.facility > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Facility Issue</span>
                      <span className="font-medium">{cancellations.byReason.facility}</span>
                    </div>
                  )}
                  {cancellations.byReason.other > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Other</span>
                      <span className="font-medium">{cancellations.byReason.other}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No-show and check-in stats */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">No-shows</span>
                <span className="font-medium">{efficiency.noShows}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Check-in Rate</span>
                <span className="font-medium">{efficiency.checkInRate}%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Contractor Utilization Card
 */
function ContractorCard({ contractorData, totalContractorHours, totalCourtHours, contractorPercentage }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-gray-900">Contractor Utilization</h3>
          <span className="text-sm text-gray-500">
            {Math.round(totalContractorHours)} hrs ({contractorPercentage}% of total)
          </span>
        </div>
      </div>
      <div className="p-4">
        {contractorData.length === 0 ? (
          <div className="text-sm text-gray-500">No contractor bookings this month</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Contractor</th>
                  <th className="text-right py-2 font-medium text-gray-700">Hours</th>
                  <th className="text-right py-2 font-medium text-gray-700">Revenue</th>
                  <th className="text-right py-2 font-medium text-gray-700">$/Hr</th>
                  <th className="text-right py-2 font-medium text-gray-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {contractorData.map(contractor => {
                  const hourlyRate = contractor.totalHours > 0
                    ? contractor.revenue / contractor.totalHours
                    : 0;
                  const percentOfTotal = totalCourtHours > 0
                    ? Math.round((contractor.totalHours / totalCourtHours) * 100)
                    : 0;

                  return (
                    <tr key={contractor.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{contractor.name}</td>
                      <td className="py-2 text-right text-gray-900">
                        {Math.round(contractor.totalHours)}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {formatCurrency(contractor.revenue)}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {formatCurrency(hourlyRate)}
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        {percentOfTotal}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{Math.round(totalContractorHours)}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(contractorData.reduce((sum, c) => sum + c.revenue, 0))}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(
                      totalContractorHours > 0
                        ? contractorData.reduce((sum, c) => sum + c.revenue, 0) / totalContractorHours
                        : 0
                    )}
                  </td>
                  <td className="py-2 text-right">{contractorPercentage}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tournaments & Events Card
 */
function TournamentsCard({ monthMetrics, ytdMetrics, monthName }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Tournaments & Events</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* This Month */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">This Month</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Events Hosted</span>
                <span className="font-medium text-lg">{monthMetrics.eventsHosted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Court Hours Used</span>
                <span className="font-medium">{Math.round(monthMetrics.courtHours)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Courts Used</span>
                <span className="font-medium">{monthMetrics.courtsUsed}</span>
              </div>
            </div>

            {/* List tournaments */}
            {monthMetrics.tournaments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-500 uppercase mb-2">Events</div>
                <ul className="space-y-1">
                  {monthMetrics.tournaments.map(t => (
                    <li key={t.tournament_id} className="text-sm text-gray-700">
                      {t.name}
                      <span className="text-gray-400 ml-1">
                        ({t.start_date}{t.end_date && t.end_date !== t.start_date ? ` - ${t.end_date}` : ''})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Year to Date */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-3">Year to Date</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Events</span>
                <span className="font-medium text-lg">{ytdMetrics.eventsHosted}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Court Hours Used</span>
                <span className="font-medium">{Math.round(ytdMetrics.courtHours)} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Bookings</span>
                <span className="font-medium">{ytdMetrics.bookingCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Comparison line showing MoM or YoY change
 */
function ComparisonLine({ label, value, suffix = '', isCurrency = false, showPercent = null }) {
  if (value === 0 && showPercent === null) {
    return (
      <div className="flex justify-between text-gray-500">
        <span>{label}</span>
        <span>—</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const prefix = isPositive ? '+' : '';

  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${color}`}>
        {prefix}{isCurrency ? formatCurrency(value) : value}{suffix}
        {showPercent !== null && ` (${showPercent > 0 ? '+' : ''}${showPercent}%)`}
      </span>
    </div>
  );
}

/**
 * Target progress indicator
 */
function TargetProgress({ current, target }) {
  const percentage = Math.round((current / target) * 100);
  const isOnTarget = current >= target;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={isOnTarget ? 'text-green-600' : 'text-amber-600'}>
          {percentage}% of target
        </span>
        <span className="text-gray-500">Target: {formatCurrency(target)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${isOnTarget ? 'bg-green-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
