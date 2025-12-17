import { useState, useMemo } from 'react';
import { CONFIG } from '../../config.js';
import {
  getTimeSlots,
  getStartOfWeek,
  getWeekDays,
  formatDateShort,
  formatDateISO,
  formatTimeShort,
  isToday,
} from '../../utils/dateHelpers.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import Select from '../common/Select.jsx';
import Button, { IconButton } from '../common/Button.jsx';
import BookingCell, { EmptyCell } from './BookingCell.jsx';

/**
 * Weekly view for a single court
 */
export default function WeekView({
  selectedDate,
  onDateChange,
  onBookingClick,
  onEmptyCellClick,
}) {
  const [selectedCourt, setSelectedCourt] = useState(1);
  const { getBookingsForDateAndCourt, loading } = useBookingsContext();
  const { courtOptions } = useCourts();

  const timeSlots = getTimeSlots();
  const weekStart = getStartOfWeek(new Date(selectedDate));
  const weekDays = getWeekDays(weekStart);

  // Generate court options if not loaded
  const courts = courtOptions.length > 0 ? courtOptions : Array.from(
    { length: CONFIG.TOTAL_COURTS },
    (_, i) => ({
      value: i + 1,
      label: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
    })
  );

  // Get bookings for selected court across the week
  const weekBookings = useMemo(() => {
    const map = new Map();

    weekDays.forEach((day) => {
      const dateStr = formatDateISO(day);
      const dayBookings = getBookingsForDateAndCourt(dateStr, selectedCourt);

      dayBookings.forEach((booking) => {
        if (booking.status === 'cancelled') return;

        const startTime = booking.time_start;
        const endTime = booking.time_end;
        const startIndex = timeSlots.indexOf(startTime);
        const endIndex = timeSlots.indexOf(endTime);
        const slotsSpanned = endIndex > startIndex ? endIndex - startIndex : 1;

        const key = `${dateStr}-${startTime}`;
        map.set(key, { booking, isFirstSlot: true, slotsSpanned });

        for (let i = 1; i < slotsSpanned; i++) {
          const slotTime = timeSlots[startIndex + i];
          if (slotTime) {
            const occupiedKey = `${dateStr}-${slotTime}`;
            map.set(occupiedKey, { booking, isFirstSlot: false, slotsSpanned: 0 });
          }
        }
      });
    });

    return map;
  }, [weekDays, selectedCourt, getBookingsForDateAndCourt, timeSlots]);

  const goToPrevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(formatDateISO(newDate));
  };

  const goToNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(formatDateISO(newDate));
  };

  const goToThisWeek = () => {
    onDateChange(formatDateISO(new Date()));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            label="Select Court"
            value={selectedCourt}
            onChange={(val) => setSelectedCourt(parseInt(val, 10))}
            options={courts}
            className="w-48"
          />
        </div>

        <div className="flex items-center gap-2">
          <IconButton onClick={goToPrevWeek} aria-label="Previous week">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </IconButton>
          <Button variant="outline" size="sm" onClick={goToThisWeek}>
            This Week
          </Button>
          <IconButton onClick={goToNextWeek} aria-label="Next week">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Week Grid */}
      <div className="overflow-auto bg-white border border-gray-200 rounded-lg">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="w-16 flex-shrink-0 h-12 flex items-center justify-center border-r border-gray-200">
              <span className="text-xs font-medium text-gray-500">Time</span>
            </div>
            {weekDays.map((day) => {
              const dateStr = formatDateISO(day);
              const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <div
                  key={dateStr}
                  className={`
                    flex-1 min-w-24 h-12 border-r border-gray-200
                    flex flex-col items-center justify-center
                    ${isToday(day) ? 'bg-primary/5' : ''}
                  `}
                >
                  <span className="text-xs font-medium text-gray-500">{dayName}</span>
                  <span className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : 'text-gray-700'}`}>
                    {formatDateShort(day)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          {timeSlots.map((time) => (
            <div key={time} className="flex">
              {/* Time Label */}
              <div className="w-16 flex-shrink-0 h-16 border-r border-b border-gray-100 flex items-start justify-end px-2 py-1">
                <span className="text-xs font-medium text-gray-500">
                  {formatTimeShort(time)}
                </span>
              </div>

              {/* Day Cells */}
              {weekDays.map((day) => {
                const dateStr = formatDateISO(day);
                const key = `${dateStr}-${time}`;
                const cellData = weekBookings.get(key);

                return (
                  <div
                    key={dateStr}
                    className={`
                      relative flex-1 min-w-24 h-16 border-r border-b border-gray-100
                      ${isToday(day) ? 'bg-primary/5' : ''}
                    `}
                  >
                    {cellData ? (
                      <BookingCell
                        booking={cellData.booking}
                        onClick={onBookingClick}
                        isFirstSlot={cellData.isFirstSlot}
                        slotsSpanned={cellData.slotsSpanned}
                      />
                    ) : (
                      <EmptyCell
                        date={dateStr}
                        court={selectedCourt}
                        time={time}
                        onClick={onEmptyCellClick}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
