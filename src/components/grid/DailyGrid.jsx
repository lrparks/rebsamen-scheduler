import { useState, useMemo, useCallback, useEffect } from 'react';
import { CONFIG } from '../../config.js';
import { getTimeSlots } from '../../utils/dateHelpers.js';
import { useBookingsContext } from '../../context/BookingsContext.jsx';
import { useCourts } from '../../hooks/useCourts.js';
import TimeColumn, { TIME_SLOT_HEIGHT } from './TimeColumn.jsx';
import CourtHeader from './CourtHeader.jsx';
import CurrentTimeLine from './CurrentTimeLine.jsx';
import BookingCell from './BookingCell.jsx';
import ClosedCell from './ClosedCell.jsx';

/**
 * Main daily grid view showing all 17 courts
 * Supports drag-to-select for booking time ranges
 */
export default function DailyGrid({
  selectedDate,
  onBookingClick,
  onEmptyCellClick,
}) {
  const { getBookingsForDate, loading, error, isSlotClosed } = useBookingsContext();
  const { courts } = useCourts();

  const timeSlots = getTimeSlots();

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { court, timeIndex }
  const [dragEnd, setDragEnd] = useState(null); // { court, timeIndex }

  // Get bookings for selected date
  const bookings = useMemo(() => {
    return getBookingsForDate(selectedDate);
  }, [getBookingsForDate, selectedDate]);

  // Generate court list
  const courtList = useMemo(() => {
    if (courts.length > 0) return courts;
    return Array.from({ length: CONFIG.TOTAL_COURTS }, (_, i) => ({
      court_number: i + 1,
      court_name: i + 1 === CONFIG.STADIUM_COURT_NUMBER ? 'Stadium' : `Court ${i + 1}`,
      status: 'open',
    }));
  }, [courts]);

  // Build booking map for quick lookup
  const bookingMap = useMemo(() => {
    const map = new Map();

    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return;

      const court = parseInt(booking.court, 10);
      const startTime = booking.time_start;
      const endTime = booking.time_end;

      const startIndex = timeSlots.indexOf(startTime);
      const endIndex = timeSlots.indexOf(endTime);
      const slotsSpanned = endIndex > startIndex ? endIndex - startIndex : 1;

      const key = `${court}-${startTime}`;
      map.set(key, {
        booking,
        isFirstSlot: true,
        slotsSpanned,
      });

      for (let i = 1; i < slotsSpanned; i++) {
        const slotTime = timeSlots[startIndex + i];
        if (slotTime) {
          const occupiedKey = `${court}-${slotTime}`;
          map.set(occupiedKey, {
            booking,
            isFirstSlot: false,
            slotsSpanned: 0,
          });
        }
      }
    });

    return map;
  }, [bookings, timeSlots]);

  // Calculate selection range (handles drag in any direction)
  const selectionRange = useMemo(() => {
    if (!dragStart || !dragEnd) return null;

    const minCourt = Math.min(dragStart.court, dragEnd.court);
    const maxCourt = Math.max(dragStart.court, dragEnd.court);
    const minTimeIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex);
    const maxTimeIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex);

    return { minCourt, maxCourt, minTimeIndex, maxTimeIndex };
  }, [dragStart, dragEnd]);

  // Check if a cell is in the selection
  const isCellSelected = useCallback((court, timeIndex) => {
    if (!selectionRange) return false;
    return (
      court >= selectionRange.minCourt &&
      court <= selectionRange.maxCourt &&
      timeIndex >= selectionRange.minTimeIndex &&
      timeIndex <= selectionRange.maxTimeIndex
    );
  }, [selectionRange]);

  // Handle drag start
  const handleDragStart = useCallback((court, timeIndex) => {
    setIsDragging(true);
    setDragStart({ court, timeIndex });
    setDragEnd({ court, timeIndex });
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((court, timeIndex) => {
    if (isDragging) {
      setDragEnd({ court, timeIndex });
    }
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (isDragging && dragStart && dragEnd && selectionRange) {
      const { minCourt, maxCourt, minTimeIndex, maxTimeIndex } = selectionRange;

      // Get the time values
      const startTime = timeSlots[minTimeIndex];
      // End time is the START of the slot after the last selected slot
      const endTime = timeSlots[maxTimeIndex + 1] || '21:00';

      // Get list of selected courts
      const selectedCourts = [];
      for (let c = minCourt; c <= maxCourt; c++) {
        selectedCourts.push(c);
      }

      // Call the handler with selection data
      onEmptyCellClick({
        date: selectedDate,
        court: minCourt, // Primary court (for single court bookings)
        courts: selectedCourts, // All selected courts (for multi-court bookings)
        time: startTime,
        timeStart: startTime,
        timeEnd: endTime,
        isMultiCourt: selectedCourts.length > 1,
      });
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, selectionRange, timeSlots, selectedDate, onEmptyCellClick]);

  // Handle mouse up anywhere (in case user releases outside grid)
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

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading bookings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading bookings: {error}</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto bg-white border border-gray-200 rounded-lg">
      {/* Grid Container */}
      <div className="relative min-w-max">
        {/* Header Row */}
        <CourtHeader courts={courtList} />

        {/* Current Time Line */}
        <CurrentTimeLine selectedDate={selectedDate} headerHeight={48} />

        {/* Grid Body */}
        <div className="flex">
          {/* Time Column */}
          <TimeColumn />

          {/* Court Columns */}
          <div className="flex flex-1">
            {courtList.map((court) => (
              <div
                key={court.court_number}
                className="flex-1 min-w-20 border-l border-gray-200"
              >
                {/* Spacer to align with TimeColumn header */}
                <div className="h-12 border-b border-gray-200" />
                {timeSlots.map((time, timeIndex) => {
                  const courtNum = parseInt(court.court_number, 10);
                  const key = `${courtNum}-${time}`;
                  const cellData = bookingMap.get(key);
                  const isSelected = isCellSelected(courtNum, timeIndex);
                  const closureInfo = !cellData ? isSlotClosed(selectedDate, courtNum, time) : null;

                  return (
                    <div
                      key={time}
                      className="relative h-16 border-b border-gray-100"
                    >
                      {cellData ? (
                        <BookingCell
                          booking={cellData.booking}
                          onClick={onBookingClick}
                          isFirstSlot={cellData.isFirstSlot}
                          slotsSpanned={cellData.slotsSpanned}
                        />
                      ) : closureInfo?.isClosed ? (
                        <ClosedCell reason={closureInfo.reason} />
                      ) : (
                        <EmptyCell
                          court={courtNum}
                          time={time}
                          timeIndex={timeIndex}
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
    </div>
  );
}

/**
 * Empty cell for creating new bookings with drag support
 */
function EmptyCell({
  court,
  time,
  timeIndex,
  isSelected,
  isDragging,
  onDragStart,
  onDragMove,
}) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    onDragStart(court, timeIndex);
  };

  const handleMouseEnter = () => {
    onDragMove(court, timeIndex);
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
