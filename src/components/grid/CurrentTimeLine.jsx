import { useState, useEffect } from 'react';
import { getCurrentTime, getTimePosition, isToday } from '../../utils/dateHelpers.js';
import { TIME_SLOT_HEIGHT } from './TimeColumn.jsx';

/**
 * Red line showing current time
 */
export default function CurrentTimeLine({ selectedDate, headerHeight = 48 }) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    // Only show on today's view
    if (!isToday(selectedDate)) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const currentTime = getCurrentTime();
      const percentage = getTimePosition(currentTime);
      setPosition(percentage);
    };

    // Initial update
    updatePosition();

    // Update every minute
    const interval = setInterval(updatePosition, 60000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  if (position === null) return null;

  // Calculate pixel position
  // Total height = number of slots * slot height
  // Position is percentage of operating hours
  const totalSlotsHeight = 25 * TIME_SLOT_HEIGHT; // 25 slots from 8:30 to 21:00
  const topPosition = headerHeight + (position / 100) * totalSlotsHeight;

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      {/* Line */}
      <div className="relative w-full h-0.5 bg-red-500">
        {/* Time indicator dot */}
        <div
          className="absolute -left-1 -top-1.5 w-4 h-4 bg-red-500 rounded-full shadow"
          title={getCurrentTime()}
        />
      </div>
    </div>
  );
}
