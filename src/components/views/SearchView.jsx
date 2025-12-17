import { useState, useMemo } from 'react';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import DatePicker, { DateRangePicker } from '../common/DatePicker.jsx';
import Button from '../common/Button.jsx';
import { formatDateDisplay, formatTimeDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { getBookingTypeLabel, getStatusBadgeClasses } from '../../utils/colors.js';
import { BOOKING_TYPES, BOOKING_STATUS } from '../../config.js';

/**
 * Search view for finding bookings
 */
export default function SearchView({ onBookingClick }) {
  const { bookings, loading } = useBookingsContext();
  const { getCourtName, courtOptions } = useCourts();

  const [searchType, setSearchType] = useState('id'); // 'id', 'name', 'phone', 'date', 'advanced'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Search results
  const results = useMemo(() => {
    if (!hasSearched && !searchQuery && !dateStart) return [];

    return bookings.filter(b => {
      // Booking ID exact match
      if (searchType === 'id' && searchQuery) {
        return b.booking_id?.toLowerCase().includes(searchQuery.toLowerCase());
      }

      // Name partial match
      if (searchType === 'name' && searchQuery) {
        return b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
      }

      // Phone partial match
      if (searchType === 'phone' && searchQuery) {
        const cleanPhone = searchQuery.replace(/\D/g, '');
        const bookingPhone = b.customer_phone?.replace(/\D/g, '') || '';
        return bookingPhone.includes(cleanPhone);
      }

      // Date range
      if (searchType === 'date') {
        if (dateStart && b.date < dateStart) return false;
        if (dateEnd && b.date > dateEnd) return false;
        return true;
      }

      // Advanced search
      if (searchType === 'advanced') {
        if (dateStart && b.date < dateStart) return false;
        if (dateEnd && b.date > dateEnd) return false;
        if (courtFilter && parseInt(b.court, 10) !== parseInt(courtFilter, 10)) return false;
        if (typeFilter && b.booking_type !== typeFilter) return false;
        if (statusFilter && b.status !== statusFilter) return false;
        if (searchQuery && !b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }

      return false;
    }).sort((a, b) => {
      // Sort by date descending
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time_start.localeCompare(a.time_start);
    });
  }, [bookings, searchType, searchQuery, dateStart, dateEnd, courtFilter, typeFilter, statusFilter, hasSearched]);

  const handleSearch = () => {
    setHasSearched(true);
  };

  const handleClear = () => {
    setSearchQuery('');
    setDateStart('');
    setDateEnd('');
    setCourtFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setHasSearched(false);
  };

  const searchTypeOptions = [
    { value: 'id', label: 'Booking ID' },
    { value: 'name', label: 'Customer Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'date', label: 'Date Range' },
    { value: 'advanced', label: 'Advanced Search' },
  ];

  const bookingTypeOptions = Object.values(BOOKING_TYPES).map(t => ({
    value: t,
    label: getBookingTypeLabel(t),
  }));

  const statusOptions = Object.values(BOOKING_STATUS).map(s => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Search Bookings</h2>

      {/* Search Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex gap-4 items-end">
          <Select
            label="Search By"
            value={searchType}
            onChange={setSearchType}
            options={searchTypeOptions}
            className="w-48"
          />

          {(searchType === 'id' || searchType === 'name' || searchType === 'phone') && (
            <Input
              label={searchType === 'id' ? 'Booking ID' : searchType === 'name' ? 'Customer Name' : 'Phone Number'}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={searchType === 'id' ? 'e.g., 1605-0900' : searchType === 'name' ? 'e.g., John Smith' : 'e.g., 501-555-1234'}
              className="flex-1"
            />
          )}

          {searchType === 'date' && (
            <div className="flex-1">
              <DateRangePicker
                label="Date Range"
                startDate={dateStart}
                endDate={dateEnd}
                onStartChange={setDateStart}
                onEndChange={setDateEnd}
              />
            </div>
          )}
        </div>

        {/* Advanced Search Fields */}
        {searchType === 'advanced' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-200 pt-4">
            <Input
              label="Customer Name"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Any name..."
            />
            <DatePicker
              label="From Date"
              value={dateStart}
              onChange={setDateStart}
            />
            <DatePicker
              label="To Date"
              value={dateEnd}
              onChange={setDateEnd}
            />
            <Select
              label="Court"
              value={courtFilter}
              onChange={setCourtFilter}
              options={courtOptions}
              placeholder="Any court"
            />
            <Select
              label="Booking Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={bookingTypeOptions}
              placeholder="Any type"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              placeholder="Any status"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-900">
              Search Results ({results.length} found)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Booking ID
                  </th>
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
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No bookings found matching your search criteria
                    </td>
                  </tr>
                ) : (
                  results.slice(0, 100).map((booking) => (
                    <tr
                      key={booking.booking_id}
                      onClick={() => onBookingClick?.(booking)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                        {booking.booking_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateDisplay(booking.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getCourtName(parseInt(booking.court, 10))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{booking.customer_name || 'N/A'}</div>
                        {booking.customer_phone && (
                          <div className="text-xs text-gray-500">{booking.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {getBookingTypeLabel(booking.booking_type)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {results.length > 100 && (
            <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-200">
              Showing first 100 results. Refine your search for more specific results.
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 text-gray-500">
          Enter search criteria and click Search to find bookings
        </div>
      )}
    </div>
  );
}
