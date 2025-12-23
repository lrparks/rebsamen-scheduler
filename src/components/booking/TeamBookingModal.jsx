import { useState, useMemo, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Select, { MultiSelect } from '../common/Select.jsx';
import Button from '../common/Button.jsx';
import { useTeams } from '../../hooks/useTeams.js';
import { useCourts } from '../../hooks/useCourts.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { createBooking } from '../../utils/api.js';
import { generateBookingId, generateGroupId } from '../../utils/bookingId.js';
import { formatDateISO, formatDateDisplay, formatTimeDisplay } from '../../utils/dateHelpers.js';
import { TEAM_TYPE_TO_BOOKING_TYPE } from '../views/TeamsView.jsx';

// Team duration mapping (in hours)
const TEAM_DURATION = {
  'high_school': 1.0,
  'team_hs': 1.0,
  'usta_league': 1.5,
  'usta_adult': 1.5,
  'usta_junior': 1.5,
  'usta': 1.5,
  'team_usta': 1.5,
  'college': 1.5,
  'team_college': 1.5,
  'other': 1.5,
  'team_other': 1.5,
};

/**
 * Get duration in hours for a team type
 */
function getTeamDuration(teamType) {
  return TEAM_DURATION[teamType] || 1.5;
}

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime(startTime, durationHours) {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + (durationHours * 60);
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * ConflictWarning component for displaying booking conflicts
 */
function ConflictWarning({ conflicts, onProceed, onCancel }) {
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
 * Team Booking Modal
 */
export default function TeamBookingModal({ isOpen, onClose }) {
  const { teams, activeTeams } = useTeams();
  const { courtOptions } = useCourts();
  const { getConflicts, addBookingLocal, refreshBookings } = useBookingsContext();
  const { initials } = useStaffContext();
  const { showToast } = useToast();

  const currentYear = new Date().getFullYear();

  // Form state
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [dateTimeEntries, setDateTimeEntries] = useState([{
    id: 1,
    date: '',
    timeStart: '09:00',
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
      setSelectedLeague('');
      setSelectedTeamId('');
      setDateTimeEntries([{
        id: 1,
        date: '',
        timeStart: '09:00',
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

  // League options (unique team types)
  const leagueOptions = useMemo(() => {
    const types = [...new Set(activeTeams.map(t => t.team_type).filter(Boolean))];
    const labels = {
      'high_school': 'High School',
      'college': 'College',
      'usta_league': 'USTA League',
      'usta': 'USTA League',
      'usta_adult': 'USTA Adult',
      'usta_junior': 'USTA Junior',
      'other': 'Other',
      'team_hs': 'High School',
      'team_college': 'College',
      'team_usta': 'USTA League',
      'team_other': 'Other',
    };
    return types.map(type => ({
      value: type,
      label: labels[type] || type,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [activeTeams]);

  // Filter teams by year and league
  const filteredTeams = useMemo(() => {
    return activeTeams.filter(team => {
      // Filter by league
      if (selectedLeague && team.team_type !== selectedLeague) {
        return false;
      }

      // Filter by year - check if season overlaps with selected year
      if (team.season_start && team.season_end) {
        const seasonStart = new Date(team.season_start);
        const seasonEnd = new Date(team.season_end);
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);

        // Check if season overlaps with selected year
        const overlaps = seasonStart <= yearEnd && seasonEnd >= yearStart;
        if (!overlaps) return false;
      }

      return true;
    });
  }, [activeTeams, selectedYear, selectedLeague]);

  // Team options for dropdown
  const teamOptions = useMemo(() => {
    return filteredTeams.map(team => ({
      value: team.team_id,
      label: team.team_name || team.name,
    }));
  }, [filteredTeams]);

  // Get selected team object
  const selectedTeam = useMemo(() => {
    return teams.find(t => t.team_id === selectedTeamId);
  }, [teams, selectedTeamId]);

  // Calculate team duration
  const teamDuration = useMemo(() => {
    if (!selectedTeam) return 1.5;
    return getTeamDuration(selectedTeam.team_type);
  }, [selectedTeam]);

  // Get rate type label
  const rateTypeLabel = useMemo(() => {
    if (!selectedTeam) return '';
    const duration = getTeamDuration(selectedTeam.team_type);
    const type = selectedTeam.team_type;
    if (type === 'high_school' || type === 'team_hs') {
      return `High School (${duration}hr)`;
    }
    if (type === 'usta_league' || type === 'usta_adult' || type === 'usta_junior' || type === 'usta' || type === 'team_usta') {
      return `USTA (${duration}hr)`;
    }
    return `${type} (${duration}hr)`;
  }, [selectedTeam]);

  // Calculate summary
  const summary = useMemo(() => {
    if (!selectedTeam) {
      return {
        totalCourts: 0,
        courtsPerDay: [],
        calculatedValue: 0,
      };
    }

    const courtsPerDay = dateTimeEntries.map(entry => ({
      date: entry.date,
      courts: entry.courts.length,
    }));

    const totalCourts = courtsPerDay.reduce((sum, day) => sum + day.courts, 0);
    const courtRate = parseFloat(selectedTeam.court_rate) || 0;
    const calculatedValue = totalCourts * courtRate * teamDuration;

    return {
      totalCourts,
      courtsPerDay,
      calculatedValue,
    };
  }, [selectedTeam, dateTimeEntries, teamDuration]);

  // Handle adding a new date/time entry
  const handleAddEntry = () => {
    const newId = Math.max(...dateTimeEntries.map(e => e.id), 0) + 1;
    setDateTimeEntries([...dateTimeEntries, {
      id: newId,
      date: '',
      timeStart: '09:00',
      courts: [],
    }]);
  };

  // Handle removing a date/time entry
  const handleRemoveEntry = (id) => {
    if (dateTimeEntries.length === 1) return; // Keep at least one
    setDateTimeEntries(dateTimeEntries.filter(e => e.id !== id));
  };

  // Handle updating an entry
  const handleUpdateEntry = (id, field, value) => {
    setDateTimeEntries(dateTimeEntries.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  // Validate form
  const validateForm = () => {
    if (!selectedTeamId) {
      showToast('Please select a team', 'error');
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
      if (!entry.timeStart) {
        showToast('Please fill in all start times', 'error');
        return false;
      }
      if (entry.courts.length === 0) {
        showToast('Please select courts for all entries', 'error');
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
      const bookingType = TEAM_TYPE_TO_BOOKING_TYPE[selectedTeam.team_type] || selectedTeam.team_type;
      const teamName = selectedTeam.team_name || selectedTeam.name;
      const groupId = generateGroupId(new Date());

      for (const entry of dateTimeEntries) {
        const timeEnd = calculateEndTime(entry.timeStart, teamDuration);

        for (const court of entry.courts) {
          proposedBookings.push({
            booking_id: generateBookingId(entry.date, court, entry.timeStart),
            group_id: groupId,
            date: entry.date,
            court: court,
            time_start: entry.timeStart,
            time_end: timeEnd,
            booking_type: bookingType,
            entity_id: selectedTeam.team_id,
            customer_name: teamName,
            customer_phone: selectedTeam.contact_phone || selectedTeam.phone || '',
            payment_status: 'invoiced',
            payment_amount: ((parseFloat(selectedTeam.court_rate) || 0) * teamDuration).toFixed(2),
            payment_method: 'invoice',
            notes: `Team booking for ${teamName}`,
            participant_count: 4,
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
        showToast(`${proposedBookings.length} team booking(s) created successfully`, 'success');

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);

        // Close modal after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        showToast(result.error || 'Failed to create team bookings', 'error');
      }
    } catch (error) {
      console.error('[TeamBookingModal] Create error:', error);
      showToast('Failed to create team bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (createdCount > 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Team Bookings Created" size="sm">
        <div className="text-center space-y-4">
          <div className="text-green-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium">{createdCount} Team Booking(s) Successfully Created!</p>
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
          onProceed={() => {}}
          onCancel={() => setShowConflicts(false)}
        />
      </Modal>
    );
  }

  // Main form
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CREATE TEAM BOOKING" size="xl">
      <div className="space-y-6">
        {/* TEAM SELECTION */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">TEAM SELECTION</h3>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Year"
              value={selectedYear}
              onChange={(val) => setSelectedYear(Number(val))}
              options={yearOptions}
              required
            />
            <Select
              label="League"
              value={selectedLeague}
              onChange={setSelectedLeague}
              options={leagueOptions}
              placeholder="All Leagues"
            />
            <Select
              label="Team"
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={teamOptions}
              placeholder="Select team..."
              required
              disabled={!selectedYear}
            />
          </div>
        </div>

        <div className="border-t border-gray-300" />

        {/* BOOKING DETAILS */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">BOOKING DETAILS</h3>

          {dateTimeEntries.map((entry, index) => (
            <div key={entry.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <Input
                    label="DATE"
                    type="date"
                    value={entry.date}
                    onChange={(val) => handleUpdateEntry(entry.id, 'date', val)}
                    required
                  />
                  <Input
                    label="START TIME"
                    type="time"
                    value={entry.timeStart}
                    onChange={(val) => handleUpdateEntry(entry.id, 'timeStart', val)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      COURT SELECTION <span className="text-red-500">*</span>
                    </label>
                    <div className="text-xs text-gray-500 mb-2">
                      Selected: {entry.courts.length > 0 ? entry.courts.join(', ') : 'None'}
                    </div>
                  </div>
                </div>

                {dateTimeEntries.length > 1 && (
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="mt-6 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3">
                <MultiSelect
                  value={entry.courts}
                  onChange={(val) => handleUpdateEntry(entry.id, 'courts', val)}
                  options={courtOptions}
                  required
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleAddEntry}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            + Add another date/time
          </button>
        </div>

        <div className="border-t border-gray-300" />

        {/* SUMMARY */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SUMMARY</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Rate Type:</span>
              <span className="font-medium">{rateTypeLabel || 'N/A'}</span>
            </div>
            {summary.courtsPerDay.length > 0 && (
              <div>
                <div className="text-gray-600 mb-1">Courts per day:</div>
                <div className="ml-4 space-y-1">
                  {summary.courtsPerDay.map((day, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{day.date ? formatDateDisplay(day.date) : 'No date'}</span>
                      <span>{day.courts} court{day.courts !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Total Courts:</span>
              <span className="font-medium">{summary.totalCourts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Calculated Value:</span>
              <span className="font-medium text-green-700">${summary.calculatedValue.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              (Team Rate × Court Qty × Time Blocks)
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="border-t border-gray-300 pt-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            CANCEL
          </Button>
          <Button
            onClick={handleCreateBooking}
            loading={loading}
            disabled={!selectedTeamId || loading}
            fullWidth
          >
            CREATE BOOKING
          </Button>
        </div>
      </div>
    </Modal>
  );
}
