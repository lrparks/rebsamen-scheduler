import { useState, useMemo, useEffect } from 'react';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import { formatDateDisplay, formatTimeDisplay, formatDateISO } from '../../utils/dateHelpers.js';
import { createTournament, updateTournament, deleteTournament } from '../../utils/api.js';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import { Textarea } from '../common/Input.jsx';
import { useToast } from '../common/Toast.jsx';

/**
 * Tournaments management view - 50/50 layout with cards on top, bookings on bottom
 */
export default function TournamentsView({ onBookingClick }) {
  const { tournaments, upcomingTournaments, loading: tournamentsLoading, error, refresh: refreshTournaments } = useTournaments();
  const { bookings, loading: bookingsLoading } = useBookingsContext();
  const { getCourtName } = useCourts();
  const { showToast } = useToast();

  const [tournamentsFilter, setTournamentsFilter] = useState('upcoming');
  const [bookingsFilter, setBookingsFilter] = useState('upcoming');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);

  const today = formatDateISO(new Date());

  // Past tournaments
  const pastTournaments = useMemo(() => {
    return tournaments.filter(t => {
      if (!t.end_date) return false;
      const endDate = new Date(t.end_date + 'T23:59:59');
      return endDate < new Date();
    }).sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));
  }, [tournaments]);

  // Filtered tournaments for display
  const filteredTournaments = useMemo(() => {
    if (tournamentsFilter === 'upcoming') return upcomingTournaments;
    if (tournamentsFilter === 'past') return pastTournaments;
    return tournaments;
  }, [tournaments, upcomingTournaments, pastTournaments, tournamentsFilter]);

  // Tournament bookings with time filter
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.booking_type !== 'tournament') return false;
      if (b.status === 'cancelled') return false;
      if (bookingsFilter === 'upcoming' && b.date < today) return false;
      if (bookingsFilter === 'past' && b.date >= today) return false;
      return true;
    }).sort((a, b) => {
      const dateCompare = bookingsFilter === 'past'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time_start.localeCompare(b.time_start);
    });
  }, [bookings, bookingsFilter, today]);

  const handleAddTournament = () => {
    setEditingTournament(null);
    setShowFormModal(true);
  };

  const handleEditTournament = (tournament) => {
    setEditingTournament(tournament);
    setSelectedTournament(null);
    setShowFormModal(true);
  };

  const handleDuplicateTournament = (tournament) => {
    setEditingTournament({
      ...tournament,
      tournament_id: null,
      name: `${tournament.name} (Copy)`,
      start_date: '',
      end_date: '',
    });
    setSelectedTournament(null);
    setShowFormModal(true);
  };

  const handleCancelTournament = async (tournament) => {
    if (!confirm(`Are you sure you want to cancel "${tournament.name}"?`)) {
      return;
    }
    try {
      const result = await deleteTournament(tournament.tournament_id);
      if (result.success) {
        showToast('Tournament cancelled successfully', 'success');
        setSelectedTournament(null);
        refreshTournaments();
      } else {
        showToast(result.error || 'Failed to cancel tournament', 'error');
      }
    } catch (error) {
      showToast('Failed to cancel tournament', 'error');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      let result;
      if (editingTournament?.tournament_id) {
        result = await updateTournament(editingTournament.tournament_id, formData);
      } else {
        result = await createTournament(formData);
      }

      if (result.success) {
        showToast(editingTournament?.tournament_id ? 'Tournament updated successfully' : 'Tournament created successfully', 'success');
        setShowFormModal(false);
        setEditingTournament(null);
        refreshTournaments();
      } else {
        showToast(result.error || 'Failed to save tournament', 'error');
      }
    } catch (error) {
      showToast('Failed to save tournament', 'error');
    }
  };

  const loading = tournamentsLoading || bookingsLoading;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Tournaments</h2>
        <button
          onClick={handleAddTournament}
          className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors"
        >
          + Add Tournament
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex-shrink-0">
          <h4 className="font-medium text-yellow-800">Tournaments Setup Required</h4>
          <p className="text-sm text-yellow-700 mt-1">
            To use this feature, create a "Tournaments" tab in your Google Sheet with these columns:
          </p>
          <code className="text-xs bg-yellow-100 px-2 py-1 rounded mt-2 block overflow-x-auto">
            tournament_id, name, organizer, contact_name, contact_phone, contact_email, start_date, end_date, default_courts, status, notes, created_at
          </code>
        </div>
      )}

      {/* TOP HALF - Tournament Cards */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Tournaments Filter Row */}
        <div className="flex items-center gap-4 mb-3 flex-shrink-0">
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
                  onClick={() => setTournamentsFilter(option.id)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    tournamentsFilter === option.id
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {filteredTournaments.length} tournament{filteredTournaments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tournament Cards - Horizontal Scroll in 2 rows */}
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tournaments...</div>
          ) : filteredTournaments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No {tournamentsFilter === 'all' ? '' : tournamentsFilter} tournaments found
            </div>
          ) : (
            <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
              {filteredTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.tournament_id}
                  tournament={tournament}
                  onClick={() => setSelectedTournament(tournament)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HALF - Tournament Bookings Table */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200">
        {/* Bookings Header & Filters */}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">Tournament Bookings</h3>
            <div className="group relative">
              <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Tournaments appear here once courts are booked for them
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
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
            <span className="text-sm text-gray-500">({filteredBookings.length})</span>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tournament</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
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
                filteredBookings.slice(0, 100).map((booking) => (
                  <tr
                    key={booking.booking_id}
                    onClick={() => onBookingClick?.(booking)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDateDisplay(booking.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatTimeDisplay(booking.time_start)} - {formatTimeDisplay(booking.time_end)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.customer_name || 'Tournament'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getCourtName(parseInt(booking.court, 10))}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{booking.booking_id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredBookings.length > 100 && (
            <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
              Showing first 100 of {filteredBookings.length} bookings
            </div>
          )}
        </div>
      </div>

      {/* Tournament Detail Modal */}
      <TournamentDetailModal
        tournament={selectedTournament}
        onClose={() => setSelectedTournament(null)}
        onEdit={handleEditTournament}
        onDuplicate={handleDuplicateTournament}
        onCancel={handleCancelTournament}
      />

      {/* Tournament Form Modal */}
      <TournamentFormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingTournament(null); }}
        tournament={editingTournament}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

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
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-500 hover:shadow-md cursor-pointer transition-all w-64 flex-shrink-0"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{tournament.name}</h4>
          {tournament.organizer && (
            <p className="text-sm text-gray-500 truncate">{tournament.organizer}</p>
          )}
        </div>
        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
          running
            ? 'bg-green-100 text-green-800'
            : tournament.status === 'cancelled'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
        }`}>
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
          <div className="text-gray-500 text-xs">Contact: {tournament.contact_name}</div>
        )}
        {tournament.default_courts && (
          <div className="text-gray-500 text-xs">Courts: {tournament.default_courts}</div>
        )}
      </div>
    </div>
  );
}

function TournamentDetailModal({ tournament, onClose, onEdit, onDuplicate, onCancel }) {
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
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            running
              ? 'bg-green-100 text-green-800'
              : tournament.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
          }`}>
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

        {/* Action Buttons */}
        <div className="border-t pt-4 flex gap-2">
          <button
            onClick={() => onEdit(tournament)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800"
          >
            Edit
          </button>
          <button
            onClick={() => onDuplicate(tournament)}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Duplicate
          </button>
          <button
            onClick={() => onCancel(tournament)}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Cancel
          </button>
        </div>

        <div className="text-xs text-gray-400">Tournament ID: {tournament.tournament_id}</div>
      </div>
    </Modal>
  );
}

function TournamentFormModal({ isOpen, onClose, tournament, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    organizer: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    start_date: '',
    end_date: '',
    default_courts: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament) {
      setFormData({
        name: tournament.name || '',
        organizer: tournament.organizer || '',
        contact_name: tournament.contact_name || '',
        contact_phone: tournament.contact_phone || '',
        contact_email: tournament.contact_email || '',
        start_date: tournament.start_date || '',
        end_date: tournament.end_date || '',
        default_courts: tournament.default_courts || '',
        notes: tournament.notes || '',
      });
    } else {
      setFormData({
        name: '',
        organizer: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        start_date: '',
        end_date: '',
        default_courts: '',
        notes: '',
      });
    }
  }, [tournament, isOpen]);

  const handleChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(formData);
    setSaving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tournament?.tournament_id ? 'Edit Tournament' : 'Add New Tournament'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tournament Name"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="Enter tournament name"
          required
        />

        <Input
          label="Organizer"
          value={formData.organizer}
          onChange={handleChange('organizer')}
          placeholder="Organization or person running the tournament"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={handleChange('start_date')}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={handleChange('end_date')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Contact Name"
            value={formData.contact_name}
            onChange={handleChange('contact_name')}
            placeholder="Primary contact"
          />
          <Input
            label="Phone"
            type="tel"
            value={formData.contact_phone}
            onChange={handleChange('contact_phone')}
            placeholder="(501) 555-1234"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.contact_email}
          onChange={handleChange('contact_email')}
          placeholder="contact@example.com"
        />

        <Input
          label="Default Courts"
          value={formData.default_courts}
          onChange={handleChange('default_courts')}
          placeholder="1,2,3,4,5,6"
        />

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Additional notes..."
          rows={2}
        />

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (tournament?.tournament_id ? 'Update Tournament' : 'Create Tournament')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
