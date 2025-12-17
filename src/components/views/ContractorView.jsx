import { useState, useMemo } from 'react';
import { useContractors } from '../../hooks/useContractors.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import Select from '../common/Select.jsx';
import { DateRangePicker } from '../common/DatePicker.jsx';
import { formatDateISO, formatDateDisplay, formatTimeDisplay, addDays } from '../../utils/dateHelpers.js';
import { useCourts } from '../../hooks/useCourts.js';

/**
 * Contractor schedule view - shows all bookings for a specific contractor
 */
export default function ContractorView({ onBookingClick }) {
  const { contractors, contractorOptions, loading: contractorsLoading } = useContractors();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();

  // Default date range: current month
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [selectedContractor, setSelectedContractor] = useState('');
  const [startDate, setStartDate] = useState(formatDateISO(startOfMonth));
  const [endDate, setEndDate] = useState(formatDateISO(endOfMonth));

  // Filter bookings for selected contractor and date range
  const filteredBookings = useMemo(() => {
    if (!selectedContractor) return [];

    return bookings.filter(b => {
      if (b.booking_type !== 'contractor') return false;
      if (b.entity_id !== selectedContractor) return false;
      if (b.date < startDate || b.date > endDate) return false;
      return true;
    }).sort((a, b) => {
      // Sort by date, then time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, selectedContractor, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalHours = filteredBookings.reduce((sum, b) => {
      const [startH, startM] = b.time_start.split(':').map(Number);
      const [endH, endM] = b.time_end.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + hours;
    }, 0);

    const courtsUsed = new Set(filteredBookings.map(b => b.court)).size;
    const activeCount = filteredBookings.filter(b => b.status === 'active').length;
    const completedCount = filteredBookings.filter(b => b.status === 'completed').length;

    return { totalHours, courtsUsed, activeCount, completedCount };
  }, [filteredBookings]);

  // Get selected contractor details
  const contractorDetails = contractors.find(c => c.contractor_id === selectedContractor);

  const loading = contractorsLoading || bookingsLoading;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Contractor Schedule</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Select Contractor"
            value={selectedContractor}
            onChange={setSelectedContractor}
            options={contractorOptions}
            placeholder={loading ? 'Loading...' : 'Choose a contractor...'}
            disabled={loading}
          />
          <DateRangePicker
            label="Date Range"
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </div>

        {/* Contractor Details */}
        {contractorDetails && (
          <div className="bg-purple-50 rounded-lg p-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="text-purple-600 font-medium">Business:</span>{' '}
                {contractorDetails.business_name || contractorDetails.name}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Contact:</span>{' '}
                {contractorDetails.name}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Phone:</span>{' '}
                {contractorDetails.phone || 'N/A'}
              </div>
              <div>
                <span className="text-purple-600 font-medium">Email:</span>{' '}
                {contractorDetails.email || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {selectedContractor && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Hours"
            value={stats.totalHours.toFixed(1)}
            color="bg-purple-100 text-purple-800"
          />
          <StatCard
            label="Courts Used"
            value={stats.courtsUsed}
            color="bg-blue-100 text-blue-800"
          />
          <StatCard
            label="Active Bookings"
            value={stats.activeCount}
            color="bg-green-100 text-green-800"
          />
          <StatCard
            label="Completed"
            value={stats.completedCount}
            color="bg-gray-100 text-gray-800"
          />
        </div>
      )}

      {/* Bookings Table */}
      {selectedContractor && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Court
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Booking ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No bookings found for this contractor in the selected date range.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr
                      key={booking.booking_id}
                      onClick={() => onBookingClick?.(booking)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateDisplay(booking.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getCourtName(parseInt(booking.court, 10))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`
                          px-2 py-1 text-xs font-medium rounded-full
                          ${booking.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                          ${booking.status === 'completed' ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {booking.booking_id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedContractor && (
        <div className="text-center py-12 text-gray-500">
          Select a contractor to view their schedule
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-lg p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
