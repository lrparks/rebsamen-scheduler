import { useState } from 'react';
import Button from '../common/Button.jsx';
import { checkInBooking } from '../../utils/api.js';
import { useStaffContext } from '../../context/StaffContext.jsx';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useToast } from '../common/Toast.jsx';

/**
 * Check-in button for active bookings
 */
export default function CheckInButton({ booking, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const { initials } = useStaffContext();
  const { updateBookingLocal, refreshBookings } = useBookingsContext();
  const toast = useToast();

  const isCheckedIn = booking.checked_in === 'TRUE' || booking.checked_in === true;
  const isActive = booking.status === 'active';

  if (!isActive || isCheckedIn) return null;

  const handleCheckIn = async () => {
    if (!initials) {
      toast.error('Please select a staff member first');
      return;
    }

    setLoading(true);
    try {
      const result = await checkInBooking(booking.booking_id, initials);

      if (result.success) {
        // Optimistic update
        updateBookingLocal(booking.booking_id, {
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: initials,
        });

        toast.success(`Checked in: ${booking.customer_name || booking.booking_id}`);
        onSuccess?.();

        // Refresh data from server
        setTimeout(() => refreshBookings(), 1000);
      } else {
        toast.error(result.error || 'Failed to check in');
      }
    } catch (error) {
      console.error('[CheckInButton] Error:', error);
      toast.error('Failed to check in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="success"
      onClick={handleCheckIn}
      loading={loading}
      fullWidth
    >
      Check In Customer
    </Button>
  );
}
