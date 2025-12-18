import { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import BookingForm from './BookingForm.jsx';
import BookingDetails from './BookingDetails.jsx';
import CheckInButton from './CheckInButton.jsx';
import CancelModal from './CancelModal.jsx';
import { generateBookingId, generateGroupId } from '../../utils/bookingId.js';
import { createBooking, updateBooking } from '../../utils/api.js';
import { formatDateISO, formatDateDisplay, formatTimeDisplay, normalizeTime } from '../../utils/dateHelpers.js';
import { BOOKING_TYPES, PAYMENT_STATUS, CONFIG } from '../../config.js';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { canMarkNoShow } from '../../utils/cancellationPolicy.js';

/**
 * Generate dates for recurring weekly bookings
 */
function generateRecurringDates(startDate, weeks) {
  const dates = [];
  const start = new Date(startDate + 'T12:00:00');
  for (let i = 0; i < weeks; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + (i * 7));
    dates.push(formatDateISO(date));
  }
  return dates;
}

/**
 * Conflict Warning Component
 */
function ConflictWarning({ conflicts, onProceed, onCancel }) {
  // Check if this is a server-detected conflict
  const isServerConflict = conflicts.some(c => c.booking_id === 'SERVER-CONFLICT');

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
              {isServerConflict
                ? 'This time slot already has an existing booking.'
                : `${conflicts.length} slot${conflicts.length > 1 ? 's' : ''} already ${conflicts.length > 1 ? 'have' : 'has'} existing bookings:`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {conflicts.map((conflict, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="font-medium text-gray-900">
              {formatDateDisplay(conflict.date)} - Court {conflict.court === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : conflict.court}
            </div>
            <div className="text-gray-600">
              {formatTimeDisplay(conflict.time_start)} - {formatTimeDisplay(conflict.time_end)}
            </div>
            {conflict.booking_id !== 'SERVER-CONFLICT' && (
              <div className="text-gray-500">
                {conflict.customer_name || conflict.booking_type} ({conflict.booking_id})
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600">
        {isServerConflict
          ? 'You can adjust the time/court, or book anyway if you plan to modify the existing reservation.'
          : 'Choose to go back and adjust, or create the booking anyway (skipping conflicting slots).'}
      </p>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} fullWidth>
          Adjust Time
        </Button>
        <Button variant="warning" onClick={onProceed} fullWidth>
          Book Anyway
        </Button>
      </div>
    </div>
  );
}

/**
 * Main booking modal for create/view/edit
 */
export default function BookingModal({
  isOpen,
  onClose,
  booking = null,
  initialData = null,
}) {
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'create', 'conflicts'
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isNoShowCancel, setIsNoShowCancel] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);

  const { initials } = useStaffContext();
  const { addBookingLocal, updateBookingLocal, refreshBookings, getConflicts, getClosureConflicts } = useBookingsContext();
  const toast = useToast();

  // Determine mode and initialize form data
  useEffect(() => {
    if (isOpen) {
      setCreatedBookingId(null);

      if (booking) {
        // View/Edit existing booking
        setMode('view');
        setFormData({
          date: booking.date,
          court: parseInt(booking.court, 10),
          courts: [parseInt(booking.court, 10)],
          timeStart: booking.time_start,
          timeEnd: booking.time_end,
          bookingType: booking.booking_type,
          entityId: booking.entity_id || '',
          customerName: booking.customer_name || '',
          customerPhone: booking.customer_phone || '',
          paymentStatus: booking.payment_status || PAYMENT_STATUS.PENDING,
          paymentAmount: booking.payment_amount || '0',
          paymentMethod: booking.payment_method || '',
          notes: booking.notes || '',
          participantCount: parseInt(booking.participant_count, 10) || 2,
          isYouth: booking.is_youth === 'TRUE' || booking.is_youth === true,
        });
      } else if (initialData) {
        // Create new booking with pre-filled data from drag selection
        setMode('create');

        // Use drag-selected times if available, otherwise calculate defaults
        const startTime = initialData.timeStart || initialData.time;
        const endTime = initialData.timeEnd || getDefaultEndTime(startTime);

        // Use drag-selected courts if available
        const selectedCourts = initialData.courts || [initialData.court];

        // Use drag-selected dates for multi-day bookings (from Weekly View)
        const selectedDates = initialData.dates || [initialData.date];

        setFormData({
          date: initialData.date,
          dates: selectedDates, // For multi-day bookings
          court: initialData.court,
          courts: selectedCourts,
          timeStart: startTime,
          timeEnd: endTime,
          bookingType: BOOKING_TYPES.OPEN,
          entityId: '',
          customerName: '',
          customerPhone: '',
          paymentStatus: PAYMENT_STATUS.PENDING,
          paymentAmount: '10.00',
          paymentMethod: '',
          notes: '',
          isMultiDay: selectedDates.length > 1,
          participantCount: 2,
          isYouth: false,
        });
      }
    }
  }, [isOpen, booking, initialData]);

  const getDefaultEndTime = (startTime) => {
    const normalized = normalizeTime(startTime);
    if (!normalized || typeof normalized !== 'string' || !normalized.includes(':')) {
      return '10:30'; // Default fallback
    }
    const parts = normalized.split(':');
    if (parts.length < 2) {
      return '10:30'; // Default fallback
    }
    const hour = parseInt(parts[0], 10) || 0;
    const minute = parseInt(parts[1], 10) || 0;
    let endHour = hour + 1;
    let endMinute = minute + 30;
    if (endMinute >= 60) {
      endMinute -= 60;
      endHour += 1;
    }
    if (endHour > 21) endHour = 21;
    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  };

  const handleFormChange = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCreate = async (skipConflictCheck = false) => {
    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    if (!formData.courts || formData.courts.length === 0) {
      toast.error('Please select at least one court');
      return;
    }

    if (!formData.customerName && formData.bookingType === BOOKING_TYPES.OPEN) {
      toast.error('Customer name is required for open play bookings');
      return;
    }

    // Validate time values
    const normalizedTimeStart = normalizeTime(formData.timeStart);
    const normalizedTimeEnd = normalizeTime(formData.timeEnd);

    if (!normalizedTimeStart || !normalizedTimeStart.includes(':')) {
      toast.error('Please select a valid start time');
      return;
    }

    if (!normalizedTimeEnd || !normalizedTimeEnd.includes(':')) {
      toast.error('Please select a valid end time');
      return;
    }

    // Get all dates - handle recurring bookings
    let dates = formData.dates || [formData.date];
    if (formData.recurring && formData.recurringWeeks > 1) {
      dates = generateRecurringDates(formData.date, formData.recurringWeeks);
    }
    const courts = formData.courts;
    const isGroup = dates.length > 1 || courts.length > 1;
    const groupId = isGroup ? generateGroupId(new Date(dates[0])) : null;

    // Build all proposed bookings
    const proposedBookings = [];
    for (const date of dates) {
      for (const court of courts) {
        proposedBookings.push({
          booking_id: generateBookingId(date, court, normalizedTimeStart),
          group_id: groupId,
          date: date,
          court: court,
          time_start: normalizedTimeStart,
          time_end: normalizedTimeEnd,
          booking_type: formData.bookingType,
          entity_id: formData.entityId || '',
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          payment_status: formData.paymentStatus,
          payment_amount: formData.paymentAmount,
          payment_method: formData.paymentMethod,
          notes: formData.notes,
          participant_count: formData.participantCount || 2,
          is_youth: formData.isYouth || false,
          status: 'active',
          created_by: initials,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Check for conflicts unless skipped
    if (!skipConflictCheck) {
      try {
        const allConflicts = [];
        for (const booking of proposedBookings) {
          // Check booking conflicts
          const bookingConflicts = getConflicts(
            booking.date,
            booking.court,
            booking.time_start,
            booking.time_end
          );
          allConflicts.push(...bookingConflicts);

          // Check closure conflicts
          const closureConflicts = getClosureConflicts(
            booking.date,
            booking.court,
            booking.time_start,
            booking.time_end
          );
          // Add closure info as pseudo-bookings for display
          closureConflicts.forEach(closure => {
            allConflicts.push({
              booking_id: `CLOSURE-${closure.date}-${closure.court}`,
              date: closure.date,
              court: closure.court === 'all' ? 'All Courts' : closure.court,
              time_start: closure.time_start || '00:00',
              time_end: closure.time_end || '21:00',
              customer_name: `CLOSED: ${closure.reason || 'Court Closure'}`,
              booking_type: 'closure',
            });
          });
        }

        if (allConflicts.length > 0) {
          // Show conflict warning
          setConflicts(allConflicts);
          setPendingBookings(proposedBookings);
          setMode('conflicts');
          return;
        }
      } catch (error) {
        console.error('[BookingModal] Conflict check error:', error);
        toast.error('Error checking for conflicts. Creating booking without conflict check.');
        // Continue with booking creation despite conflict check error
      }
    }

    // Proceed with creation
    await createBookings(proposedBookings);
  };

  const createBookings = async (bookingsToCreate, forceCreate = false) => {
    setLoading(true);
    try {
      // Add forceCreate flag if user wants to override conflict check
      const payload = bookingsToCreate.length === 1 ? bookingsToCreate[0] : bookingsToCreate;
      if (forceCreate) {
        // If single booking, add flag to it; if array, add to first one
        if (Array.isArray(payload)) {
          payload[0].forceCreate = true;
        } else {
          payload.forceCreate = true;
        }
      }

      const result = await createBooking(payload);

      if (result.success) {
        // Optimistic update
        bookingsToCreate.forEach(b => addBookingLocal(b));

        // Show success with booking ID
        const primaryId = bookingsToCreate[0].booking_id;
        setCreatedBookingId(primaryId);
        const count = bookingsToCreate.length;
        toast.success(count > 1 ? `${count} bookings created` : `Booking created: ${primaryId}`);

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);
      } else {
        // Check if it's a server-side conflict error
        const errorMsg = result.error || 'Failed to create booking';
        // Check for conflict message (case insensitive)
        const isConflict = typeof errorMsg === 'string' &&
          (errorMsg.includes('Conflict detected') ||
           errorMsg.toLowerCase().includes('conflict') ||
           errorMsg.includes('already booked'));

        if (isConflict) {
          // Parse conflict info and show modal
          const conflictInfo = parseServerConflictError(errorMsg, bookingsToCreate);
          setConflicts(conflictInfo);
          setPendingBookings(bookingsToCreate);
          setMode('conflicts');
          return; // Ensure we don't continue
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error('[BookingModal] Create error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Parse server conflict error into a format for the ConflictWarning component
  const parseServerConflictError = (errorMsg, bookings) => {
    // Error format: "Conflict detected for Court X at HH:MM"
    const match = errorMsg.match(/Court (\d+|Stadium) at (\d{2}:\d{2})/);
    if (match) {
      const court = match[1] === 'Stadium' ? 17 : parseInt(match[1], 10);
      const time = match[2];
      const booking = bookings.find(b => b.court === court) || bookings[0];
      return [{
        booking_id: 'SERVER-CONFLICT',
        date: booking.date,
        court: court,
        time_start: time,
        time_end: booking.time_end,
        customer_name: 'Existing Booking',
        booking_type: 'unknown',
      }];
    }
    // Fallback: create generic conflict from first booking
    return [{
      booking_id: 'SERVER-CONFLICT',
      date: bookings[0].date,
      court: bookings[0].court,
      time_start: bookings[0].time_start,
      time_end: bookings[0].time_end,
      customer_name: 'Existing Booking (server detected)',
      booking_type: 'unknown',
    }];
  };

  const handleProceedWithConflicts = async () => {
    // Check if this is a server-detected conflict (we need to force-create)
    const isServerConflict = conflicts.some(c => c.booking_id === 'SERVER-CONFLICT');

    if (isServerConflict) {
      // Server detected conflict - try to force create
      // Note: This requires Apps Script to support forceCreate parameter
      await createBookings(pendingBookings, true);
    } else {
      // Client-side conflict - filter out conflicting bookings
      const conflictKeys = new Set(
        conflicts.map(c => `${c.date}-${c.court}`)
      );
      const nonConflictingBookings = pendingBookings.filter(
        b => !conflictKeys.has(`${b.date}-${b.court}`)
      );

      if (nonConflictingBookings.length === 0) {
        toast.error('All selected slots have conflicts. Adjust time or court to continue.');
        setMode('create');
        return;
      }

      await createBookings(nonConflictingBookings);
    }
  };

  const handleCancelConflicts = () => {
    setConflicts([]);
    setPendingBookings([]);
    setMode('create');
  };

  const handleUpdate = async () => {
    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    // Normalize time values before sending to API
    const normalizedTimeStart = normalizeTime(formData.timeStart);
    const normalizedTimeEnd = normalizeTime(formData.timeEnd);

    if (!normalizedTimeStart || !normalizedTimeStart.includes(':')) {
      toast.error('Please select a valid start time');
      return;
    }

    if (!normalizedTimeEnd || !normalizedTimeEnd.includes(':')) {
      toast.error('Please select a valid end time');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        date: formData.date,
        court: formData.court,
        time_start: normalizedTimeStart,
        time_end: normalizedTimeEnd,
        booking_type: formData.bookingType,
        entity_id: formData.entityId || '',
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        payment_status: formData.paymentStatus,
        payment_amount: formData.paymentAmount,
        payment_method: formData.paymentMethod,
        notes: formData.notes,
        participant_count: formData.participantCount || 2,
        is_youth: formData.isYouth || false,
        modified_at: new Date().toISOString(),
      };

      const result = await updateBooking(booking.booking_id, updates);

      if (result.success) {
        updateBookingLocal(booking.booking_id, updates);
        toast.success('Booking updated');
        setMode('view');
        setTimeout(() => refreshBookings(), 1000);
      } else {
        toast.error(result.error || 'Failed to update booking');
      }
    } catch (error) {
      console.error('[BookingModal] Update error:', error);
      toast.error('Failed to update booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    const id = createdBookingId || booking?.booking_id;
    if (id) {
      navigator.clipboard.writeText(id);
      toast.info('Booking ID copied to clipboard');
    }
  };

  const handleNoShow = () => {
    setIsNoShowCancel(true);
    setShowCancelModal(true);
  };

  const handleCancel = () => {
    setIsNoShowCancel(false);
    setShowCancelModal(true);
  };

  const handleDuplicate = () => {
    // Switch to create mode with booking data pre-filled
    // Use today's date but keep time, courts, type, etc.
    const today = formatDateISO(new Date());
    setFormData({
      date: today,
      court: parseInt(booking.court, 10),
      courts: [parseInt(booking.court, 10)],
      timeStart: booking.time_start,
      timeEnd: booking.time_end,
      bookingType: booking.booking_type,
      entityId: booking.entity_id || '',
      customerName: booking.customer_name || '',
      customerPhone: booking.customer_phone || '',
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentAmount: booking.payment_amount || '10.00',
      paymentMethod: '',
      notes: booking.notes ? `(Copied from ${booking.booking_id}) ${booking.notes}` : `(Copied from ${booking.booking_id})`,
      participantCount: parseInt(booking.participant_count, 10) || 2,
      isYouth: booking.is_youth === 'TRUE' || booking.is_youth === true,
    });
    setMode('create');
  };

  // Success screen after creation (from create mode or after resolving conflicts)
  if ((mode === 'create' || mode === 'conflicts') && createdBookingId) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Booking Created" size="sm">
        <div className="text-center space-y-4">
          <div className="text-green-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="text-lg font-medium">Booking Successfully Created!</p>

          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Give this code to the customer:</p>
            <p className="text-3xl font-mono font-bold text-gray-900">{createdBookingId}</p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleCopyId}>
              Copy ID
            </Button>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  const isExistingBooking = !!booking;
  const isActive = booking?.status === 'active';
  const showNoShowButton = isActive && canMarkNoShow(booking);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          mode === 'create'
            ? 'New Booking'
            : mode === 'edit'
              ? 'Edit Booking'
              : mode === 'conflicts'
                ? 'Booking Conflicts'
                : `Booking: ${booking?.booking_id || ''}`
        }
        size="lg"
      >
        {mode === 'conflicts' ? (
          <ConflictWarning
            conflicts={conflicts}
            onProceed={handleProceedWithConflicts}
            onCancel={handleCancelConflicts}
          />
        ) : mode === 'view' && booking ? (
          <div className="space-y-4">
            <BookingDetails booking={booking} />

            {/* Actions for active bookings */}
            {isActive && (
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <CheckInButton booking={booking} onSuccess={onClose} />

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode('edit')}
                    fullWidth
                  >
                    Edit Booking
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleCancel}
                    fullWidth
                  >
                    Cancel Booking
                  </Button>
                </div>

                {showNoShowButton && (
                  <Button
                    variant="warning"
                    onClick={handleNoShow}
                    fullWidth
                  >
                    Mark as No-Show
                  </Button>
                )}

                {/* Duplicate button */}
                <Button
                  variant="secondary"
                  onClick={handleDuplicate}
                  fullWidth
                >
                  Duplicate Booking
                </Button>
              </div>
            )}

            {/* Actions for non-active bookings */}
            {!isActive && (
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <Button
                  variant="secondary"
                  onClick={handleDuplicate}
                  fullWidth
                >
                  Duplicate Booking
                </Button>
                <Button variant="outline" onClick={onClose} fullWidth>
                  Close
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <BookingForm
              formData={formData}
              onChange={handleFormChange}
              isEditing={mode === 'edit'}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {mode === 'edit' && (
                <Button variant="secondary" onClick={() => setMode('view')}>
                  Cancel
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>
                {mode === 'create' ? 'Cancel' : 'Close'}
              </Button>
              <Button
                onClick={mode === 'create' ? handleCreate : handleUpdate}
                loading={loading}
              >
                {mode === 'create' ? 'Create Booking' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          onClose();
        }}
        booking={booking}
        isNoShow={isNoShowCancel}
      />
    </>
  );
}
