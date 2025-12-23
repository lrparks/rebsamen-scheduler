import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Select, { MultiSelect } from '../common/Select.jsx';
import Button from '../common/Button.jsx';
import { useTournaments } from '../../hooks/useTournaments.js';
import { useCourts } from '../../hooks/useCourts.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { createBooking } from '../../utils/api.js';
import { generateBookingId, generateGroupId } from '../../utils/bookingId.js';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/dateHelpers.js';
import { BOOKING_TYPES } from '../../config.js';

/**
 * ConflictWarning component for displaying booking conflicts
 */
function ConflictWarning({ conflicts, onCancel }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-medium text-amber-800">Booking Conflict Detected</h4>
            <p className="text-sm text-amber-700 mt-1">
              {conflicts.length} slot{conflicts.length > 1 ? 's' : ''} already {conflicts.length > 1 ? 'have' : 'has'} existing bookings:
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {conflicts.map((conflict, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-medium text-gray-900">
              {formatDateDisplay(conflict.date)} - Court {conflict.court}
            </div>
            <div className="text-gray-600">
              {formatTimeDisplay(conflict.time_start)} - {formatTimeDisplay(conflict.time_end)}
            </div>
            <div className="text-gray-500">
              {conflict.customer_name || conflict.booking_type} ({conflict.booking_id})
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600">
        These time slots already have bookings. Please adjust your selection or cancel.
      </p>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} fullWidth>
          Go Back
        </Button>
      </div>
    </div>
  );
}

/**
 * Tournament Booking Modal
 */
export default function TournamentBookingModal({ isOpen, onClose }) {
  const { tournaments, upcomingTournaments, getTournamentById } = useTournaments();
  const { courtOptions } = useCourts();
  const { getConflicts, addBookingLocal, refreshBookings } = useBookingsContext();
  const { initials } = useStaffContext();
  const { showToast } = useToast();

  const currentYear = new Date().getFullYear();

  // Form state
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [dateTimeEntries, setDateTimeEntries] = useState([{
    id: 1,
    date: '',
    allDay: false,
    timeStart: '08:00',
    timeFinish: '17:00',
    courts: [],
  }]);

  // UI state
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedYear(currentYear);
      setSelectedTournamentId('');
      setDateTimeEntries([{
        id: 1,
        date: '',
        allDay: false,
        timeStart: '08:00',
        timeFinish: '17:00',
        courts: [],
      }]);
      setShowConflicts(false);
      setConflicts([]);
      setCreatedCount(0);
    }
  }, [isOpen, currentYear]);

  // Year options (current year ± 1)
  const yearOptions = useMemo(() => {
    return [
      { value: currentYear - 1, label: String(currentYear - 1) },
      { value: currentYear, label: String(currentYear) },
      { value: currentYear + 1, label: String(currentYear + 1) },
    ];
  }, [currentYear]);

  // Filter tournaments by year
  const filteredTournaments = useMemo(() => {
    return upcomingTournaments.filter(tournament => {
      // Filter by year - check if tournament overlaps with selected year
      if (tournament.start_date && tournament.end_date) {
        const startDate = new Date(tournament.start_date);
        const endDate = new Date(tournament.end_date);
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);

        // Check if tournament overlaps with selected year
        const overlaps = startDate <= yearEnd && endDate >= yearStart;
        return overlaps;
      }

      return true;
    });
  }, [upcomingTournaments, selectedYear]);

  // Tournament options for dropdown
  const tournamentOptions = useMemo(() => {
    return filteredTournaments.map(tournament => ({
      value: tournament.tournament_id,
      label: tournament.name,
    }));
  }, [filteredTournaments]);

  // Get selected tournament object
  const selectedTournament = useMemo(() => {
    return getTournamentById(selectedTournamentId);
  }, [getTournamentById, selectedTournamentId]);

  // Pre-populate dates when tournament is selected
  useEffect(() => {
    if (selectedTournament && selectedTournament.start_date && selectedTournament.end_date) {
      const startDate = new Date(selectedTournament.start_date);
      const endDate = new Date(selectedTournament.end_date);
      const dates = [];

      // Generate all dates between start and end
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }

      // Parse default courts
      const defaultCourts = selectedTournament.default_courts
        ? selectedTournament.default_courts.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c))
        : [];

      // Create date entries
      const newEntries = dates.map((date, index) => ({
        id: index + 1,
        date: date,
        allDay: false,
        timeStart: '08:00',
        timeFinish: '17:00',
        courts: defaultCourts,
      }));

      setDateTimeEntries(newEntries.length > 0 ? newEntries : [{
        id: 1,
        date: '',
        allDay: false,
        timeStart: '08:00',
        timeFinish: '17:00',
        courts: [],
      }]);
    }
  }, [selectedTournament]);

  // Handle adding a new date/time entry
  const handleAddEntry = () => {
    const newId = Math.max(...dateTimeEntries.map(e => e.id), 0) + 1;
    const defaultCourts = selectedTournament?.default_courts
      ? selectedTournament.default_courts.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c))
      : [];

    setDateTimeEntries([...dateTimeEntries, {
      id: newId,
      date: '',
      allDay: false,
      timeStart: '08:00',
      timeFinish: '17:00',
      courts: defaultCourts,
    }]);
  };

  // Handle removing a date/time entry
  const handleRemoveEntry = (id) => {
    if (dateTimeEntries.length === 1) return; // Keep at least one
    setDateTimeEntries(dateTimeEntries.filter(e => e.id !== id));
  };

  // Handle updating an entry
  const handleUpdateEntry = (id, field, value) => {
    setDateTimeEntries(dateTimeEntries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };

        // If toggling allDay, set time to full day range
        if (field === 'allDay') {
          if (value) {
            updated.timeStart = '08:00';
            updated.timeFinish = '21:00';
          }
        }

        return updated;
      }
      return e;
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!selectedTournamentId) {
      showToast('Please select a tournament', 'error');
      return false;
    }

    if (!initials) {
      showToast('Please select a staff member first', 'error');
      return false;
    }

    for (const entry of dateTimeEntries) {
      if (!entry.date) {
        showToast('Please fill in all dates', 'error');
        return false;
      }
      if (!entry.allDay && (!entry.timeStart || !entry.timeFinish)) {
        showToast('Please fill in all start and finish times', 'error');
        return false;
      }
      if (entry.courts.length === 0) {
        showToast('Please select courts for all entries', 'error');
        return false;
      }

      // Validate that finish time is after start time
      if (!entry.allDay && entry.timeStart >= entry.timeFinish) {
        showToast('Finish time must be after start time', 'error');
        return false;
      }
    }

    return true;
  };

  // Check for conflicts within the submission
  const checkInternalConflicts = (proposedBookings) => {
    const conflicts = [];
    const bookingMap = new Map();

    for (const booking of proposedBookings) {
      const key = `${booking.date}-${booking.court}-${booking.time_start}`;
      if (bookingMap.has(key)) {
        conflicts.push({
          booking_id: 'INTERNAL-CONFLICT',
          date: booking.date,
          court: booking.court,
          time_start: booking.time_start,
          time_end: booking.time_end,
          customer_name: 'Internal Conflict (duplicate in submission)',
          booking_type: 'internal',
        });
      } else {
        bookingMap.set(key, booking);
      }
    }

    return conflicts;
  };

  // Handle create booking
  const handleCreateBooking = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Build all proposed bookings
      const proposedBookings = [];
      const groupId = generateGroupId(new Date());

      for (const entry of dateTimeEntries) {
        for (const court of entry.courts) {
          proposedBookings.push({
            booking_id: generateBookingId(entry.date, court, entry.timeStart),
            group_id: groupId,
            date: entry.date,
            court: court,
            time_start: entry.timeStart,
            time_end: entry.timeFinish,
            booking_type: BOOKING_TYPES.TOURNAMENT,
            entity_id: selectedTournament.tournament_id,
            customer_name: selectedTournament.name,
            customer_phone: selectedTournament.contact_phone || '',
            payment_status: 'invoiced',
            payment_amount: 0,
            payment_method: 'invoice',
            notes: `Tournament booking for ${selectedTournament.name} (${selectedTournament.organizer})`,
            participant_count: 0,
            is_youth: false,
            status: 'active',
            created_by: initials,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Check for internal conflicts (duplicates within submission)
      const internalConflicts = checkInternalConflicts(proposedBookings);
      if (internalConflicts.length > 0) {
        setConflicts(internalConflicts);
        setShowConflicts(true);
        setLoading(false);
        return;
      }

      // Check for external conflicts with existing bookings
      const allConflicts = [];
      for (const booking of proposedBookings) {
        const bookingConflicts = getConflicts(
          booking.date,
          booking.court,
          booking.time_start,
          booking.time_end
        );
        allConflicts.push(...bookingConflicts);
      }

      if (allConflicts.length > 0) {
        setConflicts(allConflicts);
        setShowConflicts(true);
        setLoading(false);
        return;
      }

      // No conflicts, create bookings
      const payload = proposedBookings.length === 1 ? proposedBookings[0] : proposedBookings;
      const result = await createBooking(payload);

      if (result.success) {
        // Optimistic update
        proposedBookings.forEach(b => addBookingLocal(b));

        // Show success
        setCreatedCount(proposedBookings.length);
        showToast(`${proposedBookings.length} tournament booking(s) created successfully`, 'success');

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);

        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        showToast(result.error || 'Failed to create tournament bookings', 'error');
      }
    } catch (error) {
      console.error('[TournamentBookingModal] Create error:', error);
      showToast('Failed to create tournament bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (createdCount > 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Tournament Bookings Created" size="sm">
        <div className="text-center space-y-4">
          <div className="text-green-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">{createdCount} Tournament Booking(s) Successfully Created!</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  // Conflict warning screen
  if (showConflicts) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Booking Conflicts" size="lg">
        <ConflictWarning
          conflicts={conflicts}
          onCancel={() => setShowConflicts(false)}
        />
      </Modal>
    );
  }

  // Main form
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TOURNAMENT BOOKING MODAL" size="xl">
      <div className="space-y-6">
        {/* TOURNAMENT SELECTION */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">TOURNAMENT SELECTION</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Year"
              value={selectedYear}
              onChange={(val) => setSelectedYear(Number(val))}
              options={yearOptions}
              required
            />
            <Select
              label="Tournament Name"
              value={selectedTournamentId}
              onChange={setSelectedTournamentId}
              options={tournamentOptions}
              placeholder="Select Tournament Name..."
              required
              disabled={!selectedYear}
            />
          </div>

          {selectedTournament && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">Start Date:</span>{' '}
                  <span className="font-medium">{formatDateDisplay(selectedTournament.start_date)}</span>
                </div>
                <div>
                  <span className="text-gray-600">End Date:</span>{' '}
                  <span className="font-medium">{formatDateDisplay(selectedTournament.end_date)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Organizer:</span>{' '}
                  <span className="font-medium">{selectedTournament.organizer}</span>
                </div>
                <div>
                  <span className="text-gray-600">Contact:</span>{' '}
                  <span className="font-medium">{selectedTournament.contact_name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-300" />

        {/* SCHEDULE BY DAY */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SCHEDULE BY DAY</h3>

          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
              <div className="col-span-3">DATE</div>
              <div className="col-span-1 text-center">ALL DAY</div>
              <div className="col-span-2">START</div>
              <div className="col-span-2">FINISH</div>
              <div className="col-span-4">COURTS</div>
            </div>

            {/* Entries */}
            {dateTimeEntries.map((entry, index) => (
              <div key={entry.id} className="grid grid-cols-12 gap-2 items-start p-2 bg-gray-50 rounded-lg">
                <div className="col-span-3">
                  <Input
                    type="date"
                    value={entry.date}
                    onChange={(val) => handleUpdateEntry(entry.id, 'date', val)}
                    required
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center pt-2">
                  <input
                    type="checkbox"
                    checked={entry.allDay}
                    onChange={(e) => handleUpdateEntry(entry.id, 'allDay', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    type="time"
                    value={entry.timeStart}
                    onChange={(val) => handleUpdateEntry(entry.id, 'timeStart', val)}
                    disabled={entry.allDay}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    type="time"
                    value={entry.timeFinish}
                    onChange={(val) => handleUpdateEntry(entry.id, 'timeFinish', val)}
                    disabled={entry.allDay}
                    required
                  />
                </div>

                <div className="col-span-3">
                  <MultiSelect
                    value={entry.courts}
                    onChange={(val) => handleUpdateEntry(entry.id, 'courts', val)}
                    options={courtOptions}
                    placeholder="Select..."
                    required
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  {dateTimeEntries.length > 1 && (
                    <button
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddEntry}
            className="mt-3 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            + Add another day...
          </button>
        </div>

        <div className="border-t border-gray-300" />

        {/* COURT SELECTION NOTE */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Court Selection Note:</strong> Use the multi-select interface above (Courts 1-16 + Stadium) for each day.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="border-t border-gray-300 pt-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            CANCEL
          </Button>
          <Button
            onClick={handleCreateBooking}
            loading={loading}
            disabled={!selectedTournamentId || loading}
            fullWidth
          >
            CREATE BOOKING
          </Button>
        </div>
      </div>
    </Modal>
  );
}
