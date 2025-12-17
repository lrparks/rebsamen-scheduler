import { formatDateDisplay, formatTimeDisplay } from '../../utils/dateHelpers.js';
import { getBookingTypeLabel, getStatusBadgeClasses } from '../../utils/colors.js';
import { useCourts } from '../../hooks/useCourts.js';

/**
 * Display booking details in a readable format
 */
export default function BookingDetails({ booking }) {
  const { getCourtName } = useCourts();

  if (!booking) return null;

  const isCheckedIn = booking.checked_in === 'TRUE' || booking.checked_in === true;

  return (
    <div className="space-y-4">
      {/* Booking ID Banner */}
      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Booking ID</span>
        <p className="text-2xl font-mono font-bold text-gray-900">{booking.booking_id}</p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center gap-2">
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClasses(booking.status)}`}>
          {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
        </span>
        {isCheckedIn && (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            Checked In
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <DetailItem label="Date" value={formatDateDisplay(booking.date)} />
        <DetailItem label="Court" value={getCourtName(parseInt(booking.court, 10))} />
        <DetailItem label="Time" value={`${formatTimeDisplay(booking.time_start)} - ${formatTimeDisplay(booking.time_end)}`} />
        <DetailItem label="Type" value={getBookingTypeLabel(booking.booking_type)} />
        <DetailItem label="Customer" value={booking.customer_name || '-'} />
        <DetailItem label="Phone" value={booking.customer_phone || '-'} />
        <DetailItem label="Payment" value={`$${booking.payment_amount || '0.00'} (${booking.payment_status || 'pending'})`} />
        <DetailItem label="Created By" value={booking.created_by || '-'} />
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</h4>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </div>
      )}

      {/* Check-in Info */}
      {isCheckedIn && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Check-in Info</h4>
          <p className="text-sm text-gray-700">
            Checked in at {booking.checked_in_at} by {booking.checked_in_by}
          </p>
        </div>
      )}

      {/* Cancellation Info */}
      {booking.status === 'cancelled' && (
        <div className="border-t border-gray-200 pt-4 bg-red-50 -mx-6 -mb-4 px-6 pb-4 rounded-b-lg">
          <h4 className="text-xs font-medium text-red-500 uppercase mb-1">Cancellation Info</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Reason:</strong> {booking.cancel_reason}</p>
            <p><strong>Cancelled by:</strong> {booking.cancelled_by} at {booking.cancelled_at}</p>
            {booking.refund_status && (
              <p><strong>Refund:</strong> {booking.refund_status} {booking.refund_amount && `($${booking.refund_amount})`}</p>
            )}
            {booking.refund_note && (
              <p><strong>Note:</strong> {booking.refund_note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
