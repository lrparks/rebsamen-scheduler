import { useState, useMemo, useCallback, useEffect } from 'react';
import { CONFIG } from '../../config.js';
import {
  getTimeSlots,
  getStartOfWeek,
  getWeekDays,
  formatDateShort,
  formatDateISO,
  formatTimeShort,
  isToday,
  parseDate,
} from '../../utils/dateHelpers.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import Select from '../common/Select.jsx';
import Button, { IconButton } from '../common/Button.jsx';
import BookingCell from './BookingCell.jsx';

/**
 * Weekly view for a single court with drag-to-select support
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

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { dayIndex, timeIndex }
  const [dragEnd, setDragEnd] = useState(null); // { dayIndex, timeIndex }

  const timeSlots = getTimeSlots();
  const weekStart = getStartOfWeek(parseDate(selectedDate));
  const weekDays = getWeekDays(weekStart);

  // Generate court options if not loaded
  const courts = courtOptions.length > 0 ? courtOptions : Array.from(
    { length: CONFIG.TOTAL_COURTS },
    (_, i) => ({
      value: i + 1,
      label: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
    })
  );

  // Get bookings for selected court across the week - supports overlapping bookings
  const weekBookings = useMemo(() => {
    const map = new Map();

    // First pass: collect all bookings per slot
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

        // Add to each slot this booking occupies
        for (let i = 0; i < slotsSpanned; i++) {
          const slotTime = timeSlots[startIndex + i];
          if (slotTime) {
            const key = `${dateStr}-${slotTime}`;
            if (!map.has(key)) {
              map.set(key, []);
            }
            map.get(key).push({
              booking,
              isFirstSlot: i === 0,
              slotsSpanned: i === 0 ? slotsSpanned : 0,
            });
          }
        }
      });
    });

    // Second pass: calculate overlap positions for each slot
    map.forEach((bookingsInSlot, key) => {
      const count = bookingsInSlot.length;
      bookingsInSlot.forEach((item, index) => {
        item.overlapCount = count;
        item.overlapIndex = index;
      });
    });

    return map;
  }, [weekDays, selectedCourt, getBookingsForDateAndCourt, timeSlots]);

  // Calculate selection range
  const selectionRange = useMemo(() => {
    if (!dragStart || !dragEnd) return null;

    const minDayIndex = Math.min(dragStart.dayIndex, dragEnd.dayIndex);
    const maxDayIndex = Math.max(dragStart.dayIndex, dragEnd.dayIndex);
    const minTimeIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex);
    const maxTimeIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex);

    return { minDayIndex, maxDayIndex, minTimeIndex, maxTimeIndex };
  }, [dragStart, dragEnd]);

  // Check if a cell is in the selection
  const isCellSelected = useCallback((dayIndex, timeIndex) => {
    if (!selectionRange) return false;
    return (
      dayIndex >= selectionRange.minDayIndex &&
      dayIndex <= selectionRange.maxDayIndex &&
      timeIndex >= selectionRange.minTimeIndex &&
      timeIndex <= selectionRange.maxTimeIndex
    );
  }, [selectionRange]);

  // Handle drag start
  const handleDragStart = useCallback((dayIndex, timeIndex) => {
    setIsDragging(true);
    setDragStart({ dayIndex, timeIndex });
    setDragEnd({ dayIndex, timeIndex });
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((dayIndex, timeIndex) => {
    if (isDragging) {
      setDragEnd({ dayIndex, timeIndex });
    }
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (isDragging && dragStart && dragEnd && selectionRange) {
      const { minDayIndex, maxDayIndex, minTimeIndex, maxTimeIndex } = selectionRange;

      // Get the time values
      const startTime = timeSlots[minTimeIndex];
      const endTime = timeSlots[maxTimeIndex + 1] || '21:00';

      // Get list of selected dates
      const selectedDates = [];
      for (let d = minDayIndex; d <= maxDayIndex; d++) {
        selectedDates.push(formatDateISO(weekDays[d]));
      }

      // Call the handler with selection data
      onEmptyCellClick({
        date: selectedDates[0], // Primary date
        dates: selectedDates, // All selected dates
        court: selectedCourt,
        courts: [selectedCourt],
        time: startTime,
        timeStart: startTime,
        timeEnd: endTime,
        isMultiDay: selectedDates.length > 1,
      });
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, selectionRange, timeSlots, weekDays, selectedCourt, onEmptyCellClick]);

  // Handle mouse up anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, handleDragEnd]);

  // Prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

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

  const handlePrint = () => {
    window.print();
  };

  // Format week range for print header
  const weekRangeStr = `${formatDateShort(weekDays[0])} - ${formatDateShort(weekDays[6])}`;

  const goToPrevCourt = () => {
    if (selectedCourt > 1) {
      setSelectedCourt(selectedCourt - 1);
    }
  };

  const goToNextCourt = () => {
    if (selectedCourt < CONFIG.TOTAL_COURTS) {
      setSelectedCourt(selectedCourt + 1);
    }
  };

  const courtLabel = selectedCourt === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium Court' : `Court ${selectedCourt}`;

  return (
    <div className="space-y-4 print-container">
      {/* Print Header - only visible when printing */}
      <div className="print-header hidden">
        <h1>Rebsamen Tennis Center - {courtLabel}</h1>
        <p>Week of {weekRangeStr}</p>
      </div>

      {/* Controls - hidden when printing */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <IconButton
            onClick={goToPrevCourt}
            aria-label="Previous court"
            disabled={selectedCourt <= 1}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </IconButton>
          <Select
            label="Select Court"
            value={selectedCourt}
            onChange={(val) => setSelectedCourt(parseInt(val, 10))}
            options={courts}
            className="w-48"
          />
          <IconButton
            onClick={goToNextCourt}
            aria-label="Next court"
            disabled={selectedCourt >= CONFIG.TOTAL_COURTS}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </IconButton>
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

          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="overflow-auto bg-white border border-gray-200 rounded-lg print-grid">
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
                    ${isToday(day) ? 'bg-green-50' : ''}
                  `}
                >
                  <span className="text-xs font-medium text-gray-500">{dayName}</span>
                  <span className={`text-sm font-semibold ${isToday(day) ? 'text-green-700' : 'text-gray-700'}`}>
                    {formatDateShort(day)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          {timeSlots.map((time, timeIndex) => (
            <div key={time} className="flex">
              {/* Time Label */}
              <div className="w-16 flex-shrink-0 h-16 border-r border-b border-gray-100 flex items-start justify-end px-2 py-1">
                <span className="text-xs font-medium text-gray-500">
                  {formatTimeShort(time)}
                </span>
              </div>

              {/* Day Cells */}
              {weekDays.map((day, dayIndex) => {
                const dateStr = formatDateISO(day);
                const key = `${dateStr}-${time}`;
                const cellDataArray = weekBookings.get(key);
                const isSelected = isCellSelected(dayIndex, timeIndex);

                return (
                  <div
                    key={dateStr}
                    className={`
                      relative flex-1 min-w-24 h-16 border-r border-b border-gray-100
                      ${isToday(day) ? 'bg-green-50' : ''}
                    `}
                  >
                    {cellDataArray && cellDataArray.length > 0 ? (
                      // Render all overlapping bookings
                      cellDataArray.map((cellData, idx) => (
                        <BookingCell
                          key={cellData.booking.booking_id}
                          booking={cellData.booking}
                          onClick={onBookingClick}
                          isFirstSlot={cellData.isFirstSlot}
                          slotsSpanned={cellData.slotsSpanned}
                          overlapCount={cellData.overlapCount}
                          overlapIndex={cellData.overlapIndex}
                        />
                      ))
                    ) : (
                      <EmptyCell
                        dayIndex={dayIndex}
                        time={time}
                        timeIndex={timeIndex}
                        court={selectedCourt}
                        isSelected={isSelected}
                        isDragging={isDragging}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
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

/**
 * Empty cell for WeekView with drag support
 */
function EmptyCell({
  dayIndex,
  time,
  timeIndex,
  court,
  isSelected,
  isDragging,
  onDragStart,
  onDragMove,
}) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    onDragStart(dayIndex, timeIndex);
  };

  const handleMouseEnter = () => {
    onDragMove(dayIndex, timeIndex);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      className={`
        absolute inset-0.5 rounded
        transition-colors cursor-pointer select-none
        ${isSelected
          ? 'bg-green-200 border-2 border-green-500'
          : 'bg-transparent hover:bg-gray-100 border border-transparent hover:border-gray-300 hover:border-dashed'
        }
        ${isDragging ? 'cursor-crosshair' : ''}
      `}
      title={`Book Court ${court} at ${time}`}
    >
      <span className="sr-only">Book Court {court} at {time}</span>
    </div>
  );
}
