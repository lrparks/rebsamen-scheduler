import { useState, useMemo } from 'react';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import Modal from '../common/Modal.jsx';

/**
 * Tournaments management view
 */
export default function TournamentsView({ onBookingClick }) {
  const { tournaments, upcomingTournaments, loading: tournamentsLoading, error } = useTournaments();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'bookings'
  const [bookingsFilter, setBookingsFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [selectedTournament, setSelectedTournament] = useState(null); // For modal

  const today = formatDateISO(new Date());

  // Past tournaments (sorted by end_date descending - most recent first)
  const pastTournaments = useMemo(() => {
    return tournaments.filter(t => {
      if (!t.end_date) return false;
      const endDate = new Date(t.end_date + 'T23:59:59');
      return endDate < new Date();
    }).sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));
  }, [tournaments]);

  // Tournament bookings with time filter
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.booking_type !== 'tournament') return false;
      if (b.status === 'cancelled') return false;

      // Time filter
      if (bookingsFilter === 'upcoming' && b.date < today) return false;
      if (bookingsFilter === 'past' && b.date >= today) return false;

      return true;
    }).sort((a, b) => {
      // Sort by date (descending for past, ascending for upcoming)
      const dateCompare = bookingsFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, bookingsFilter, today]);

  const loading = tournamentsLoading || bookingsLoading;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-900">Tournaments</h2>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800">Tournaments Setup Required</h4>
          <p className="text-sm text-yellow-700 mt-1">
            To use this feature, create a "Tournaments" tab in your Google Sheet with these columns:
          </p>
          <code className="text-xs bg-yellow-100 px-2 py-1 rounded mt-2 block overflow-x-auto">
            tournament_id, name, organizer, contact_name, contact_phone, contact_email, start_date, end_date, default_courts, status, notes, created_at
          </code>
          <p className="text-xs text-yellow-600 mt-2">
            Then publish the sheet and update the tournaments URL in config.js with the correct GID.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming ({upcomingTournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'past'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Past ({pastTournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bookings'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Court Bookings
        </button>
      </div>

      {/* Upcoming Tournaments Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tournaments...</div>
          ) : upcomingTournaments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming tournaments found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.tournament_id}
                  tournament={tournament}
                  onClick={() => setSelectedTournament(tournament)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past Tournaments Tab */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tournaments...</div>
          ) : pastTournaments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No past tournaments found
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tournament
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dates
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Organizer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pastTournaments.map((tournament) => (
                    <tr
                      key={tournament.tournament_id}
                      onClick={() => setSelectedTournament(tournament)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {tournament.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateDisplay(tournament.start_date)}
                        {tournament.end_date && tournament.end_date !== tournament.start_date && (
                          <> - {formatDateDisplay(tournament.end_date)}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {tournament.organizer || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          {tournament.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Court Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Time Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past' },
                { id: 'all', label: 'All' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setBookingsFilter(option.id)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    bookingsFilter === option.id
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-2">
              ({filteredBookings.length} bookings)
            </span>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Tournament Court Bookings</h3>
              <p className="text-sm text-gray-500">Court reservations for tournament events</p>
            </div>
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
                      Tournament
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Court
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
                        No {bookingsFilter === 'all' ? '' : bookingsFilter} tournament bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.slice(0, 50).map((booking) => (
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {booking.customer_name || 'Tournament'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getCourtName(parseInt(booking.court, 10))}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">
                          {booking.booking_id}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredBookings.length > 50 && (
                <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
                  Showing first 50 of {filteredBookings.length} bookings
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
      />
    </div>
  );
}

/**
 * Tournament card component
 */
function TournamentCard({ tournament, onClick }) {
  const isCurrentlyRunning = () => {
    if (!tournament.start_date || !tournament.end_date) return false;
    const today = new Date();
    const start = new Date(tournament.start_date + 'T00:00:00');
    const end = new Date(tournament.end_date + 'T23:59:59');
    return today >= start && today <= end;
  };

  const running = isCurrentlyRunning();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{tournament.name}</h4>
          {tournament.organizer && (
            <p className="text-sm text-gray-500">{tournament.organizer}</p>
          )}
        </div>
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full
          ${running
            ? 'bg-green-100 text-green-800'
            : tournament.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }
        `}>
          {running ? 'In Progress' : tournament.status || 'Scheduled'}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {tournament.start_date && (
          <div>
            <span className="text-gray-500">Dates:</span>{' '}
            {formatDateDisplay(tournament.start_date)}
            {tournament.end_date && tournament.end_date !== tournament.start_date && (
              <> - {formatDateDisplay(tournament.end_date)}</>
            )}
          </div>
        )}
        {tournament.contact_name && (
          <div className="text-gray-500 text-xs">
            Contact: {tournament.contact_name}
          </div>
        )}
        {tournament.default_courts && (
          <div className="text-gray-500 text-xs">
            Courts: {tournament.default_courts}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tournament detail modal
 */
function TournamentDetailModal({ tournament, onClose }) {
  if (!tournament) return null;

  const isCurrentlyRunning = () => {
    if (!tournament.start_date || !tournament.end_date) return false;
    const today = new Date();
    const start = new Date(tournament.start_date + 'T00:00:00');
    const end = new Date(tournament.end_date + 'T23:59:59');
    return today >= start && today <= end;
  };

  const running = isCurrentlyRunning();

  return (
    <Modal isOpen={!!tournament} onClose={onClose} title="Tournament Details">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
            {tournament.organizer && (
              <p className="text-sm text-gray-500">{tournament.organizer}</p>
            )}
          </div>
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${running
              ? 'bg-green-100 text-green-800'
              : tournament.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }
          `}>
            {running ? 'In Progress' : tournament.status || 'Scheduled'}
          </span>
        </div>

        <div className="border-t pt-4 space-y-3">
          {tournament.start_date && (
            <div>
              <span className="text-sm font-medium text-gray-500">Dates:</span>
              <p className="text-gray-900">
                {formatDateDisplay(tournament.start_date)}
                {tournament.end_date && tournament.end_date !== tournament.start_date && (
                  <> - {formatDateDisplay(tournament.end_date)}</>
                )}
              </p>
            </div>
          )}
          {tournament.contact_name && (
            <div>
              <span className="text-sm font-medium text-gray-500">Contact:</span>
              <p className="text-gray-900">{tournament.contact_name}</p>
            </div>
          )}
          {tournament.contact_phone && (
            <div>
              <span className="text-sm font-medium text-gray-500">Phone:</span>
              <p className="text-gray-900">{tournament.contact_phone}</p>
            </div>
          )}
          {tournament.contact_email && (
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p className="text-gray-900">{tournament.contact_email}</p>
            </div>
          )}
          {tournament.default_courts && (
            <div>
              <span className="text-sm font-medium text-gray-500">Default Courts:</span>
              <p className="text-gray-900">{tournament.default_courts}</p>
            </div>
          )}
          {tournament.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">Notes:</span>
              <p className="text-gray-900">{tournament.notes}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-xs text-gray-400">
          Tournament ID: {tournament.tournament_id}
        </div>
      </div>
    </Modal>
  );
}
