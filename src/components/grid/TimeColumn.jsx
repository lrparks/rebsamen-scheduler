import { getTimeSlots, formatTimeShort } from '../../utils/dateHelpers.js';

/**
 * Time column showing time labels
 */
export default function TimeColumn() {
  const timeSlots = getTimeSlots();

  return (
    <div className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200">
      {/* Header cell */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-500">Time</span>
      </div>

      {/* Time slots */}
      {timeSlots.map((time) => (
        <div
          key={time}
          className="h-16 border-b border-gray-100 flex items-start justify-end px-2 py-1"
        >
          <span className="text-xs font-medium text-gray-500">
            {formatTimeShort(time)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Get time slot height (in pixels)
 */
export const TIME_SLOT_HEIGHT = 64; // h-16 = 4rem = 64px
