import { getBookingCellClasses, getBookingTypeLabel } from '../../utils/colors.js';
import { formatTimeShort } from '../../utils/dateHelpers.js';

/**
 * Individual booking cell in the grid
 */
export default function BookingCell({
  booking,
  onClick,
  isFirstSlot = true,
  slotsSpanned = 1,
}) {
  if (!booking) return null;

  const colorClasses = getBookingCellClasses(booking.booking_type);
  const isCheckedIn = booking.checked_in === 'TRUE' || booking.checked_in === true;
  const isCancelled = booking.status === 'cancelled';
  const isNoShow = booking.status === 'no_show';

  // Only render for the first slot of a booking
  if (!isFirstSlot) return null;

  // Calculate height based on slots spanned
  // Each slot is h-16 (64px), minus 1px for border
  const height = slotsSpanned * 64 - 1;

  return (
    <button
      onClick={() => onClick(booking)}
      className={`
        absolute inset-x-0.5 overflow-hidden rounded
        text-left cursor-pointer transition-all
        hover:shadow-md hover:z-20
        ${colorClasses}
        ${isCancelled || isNoShow ? 'opacity-50 line-through' : ''}
      `}
      style={{
        height: `${height}px`,
        top: 0,
      }}
      title={`${booking.customer_name || booking.entity_id || 'Booking'} - ${formatTimeShort(booking.time_start)} to ${formatTimeShort(booking.time_end)}`}
    >
      <div className="p-1 h-full flex flex-col">
        {/* Customer/Entity Name */}
        <div className="text-xs font-medium truncate">
          {booking.customer_name || getBookingTypeLabel(booking.booking_type)}
        </div>

        {/* Time range - show if there's room */}
        {slotsSpanned >= 2 && (
          <div className="text-[10px] opacity-75">
            {formatTimeShort(booking.time_start)} - {formatTimeShort(booking.time_end)}
          </div>
        )}

        {/* Status indicators */}
        <div className="mt-auto flex items-center gap-1">
          {isCheckedIn && (
            <span className="text-[10px] bg-green-500 text-white px-1 rounded" title="Checked In">
              ✓
            </span>
          )}
          {isCancelled && (
            <span className="text-[10px] bg-red-500 text-white px-1 rounded">
              X
            </span>
          )}
          {isNoShow && (
            <span className="text-[10px] bg-yellow-500 text-white px-1 rounded">
              NS
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Empty cell for creating new bookings
 */
export function EmptyCell({ date, court, time, onClick }) {
  return (
    <button
      onClick={() => onClick({ date, court, time })}
      className="
        absolute inset-0.5 rounded
        bg-transparent hover:bg-gray-100
        transition-colors cursor-pointer
        border border-transparent hover:border-gray-300 hover:border-dashed
      "
      title={`Book Court ${court} at ${time}`}
    >
      <span className="sr-only">Book Court {court} at {time}</span>
    </button>
  );
}
