import { useState, useEffect } from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import BookingForm from './BookingForm.jsx';
import BookingDetails from './BookingDetails.jsx';
import CheckInButton from './CheckInButton.jsx';
import CancelModal from './CancelModal.jsx';
import { generateBookingId, generateGroupId } from '../../utils/bookingId.js';
import { createBooking, updateBooking } from '../../utils/api.js';
import { formatDateISO } from '../../utils/dateHelpers.js';
import { BOOKING_TYPES, PAYMENT_STATUS } from '../../config.js';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useToast } from '../common/Toast.jsx';
import { canMarkNoShow } from '../../utils/cancellationPolicy.js';

/**
 * Main booking modal for create/view/edit
 */
export default function BookingModal({
  isOpen,
  onClose,
  booking = null,
  initialData = null,
}) {
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'create'
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isNoShowCancel, setIsNoShowCancel] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState(null);

  const { initials } = useStaffContext();
  const { addBookingLocal, updateBookingLocal, refreshBookings } = useBookingsContext();
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
        });
      }
    }
  }, [isOpen, booking, initialData]);

  const getDefaultEndTime = (startTime) => {
    const [hour, minute] = startTime.split(':').map(Number);
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

  const handleCreate = async () => {
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

    setLoading(true);
    try {
      // Get all dates (for multi-day) and courts (for multi-court)
      const dates = formData.dates || [formData.date];
      const courts = formData.courts;
      const isGroup = dates.length > 1 || courts.length > 1;
      const groupId = isGroup ? generateGroupId(new Date(dates[0])) : null;

      // Create booking for each date-court combination
      const bookings = [];
      for (const date of dates) {
        for (const court of courts) {
          bookings.push({
            booking_id: generateBookingId(date, court, formData.timeStart),
            group_id: groupId,
            date: date,
            court: court,
            time_start: formData.timeStart,
            time_end: formData.timeEnd,
            booking_type: formData.bookingType,
            entity_id: formData.entityId || '',
            customer_name: formData.customerName,
            customer_phone: formData.customerPhone,
            payment_status: formData.paymentStatus,
            payment_amount: formData.paymentAmount,
            payment_method: formData.paymentMethod,
            notes: formData.notes,
            status: 'active',
            created_by: initials,
            created_at: new Date().toISOString(),
          });
        }
      }

      const result = await createBooking(bookings.length === 1 ? bookings[0] : bookings);

      if (result.success) {
        // Optimistic update
        bookings.forEach(b => addBookingLocal(b));

        // Show success with booking ID
        const primaryId = bookings[0].booking_id;
        setCreatedBookingId(primaryId);
        const count = bookings.length;
        toast.success(count > 1 ? `${count} bookings created` : `Booking created: ${primaryId}`);

        // Refresh data
        setTimeout(() => refreshBookings(), 1000);
      } else {
        toast.error(result.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('[BookingModal] Create error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        date: formData.date,
        court: formData.court,
        time_start: formData.timeStart,
        time_end: formData.timeEnd,
        booking_type: formData.bookingType,
        entity_id: formData.entityId || '',
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        payment_status: formData.paymentStatus,
        payment_amount: formData.paymentAmount,
        payment_method: formData.paymentMethod,
        notes: formData.notes,
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
    });
    setMode('create');
  };

  // Success screen after creation
  if (mode === 'create' && createdBookingId) {
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
              : `Booking: ${booking?.booking_id || ''}`
        }
        size="lg"
      >
        {mode === 'view' && booking ? (
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
