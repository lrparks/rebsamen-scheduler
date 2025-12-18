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

  // Build booking map for quick lookup - supports overlapping bookings
  const bookingMap = useMemo(() => {
    const map = new Map();

    // Helper to check if two bookings overlap in time
    const bookingsOverlap = (b1, b2) => {
      if (parseInt(b1.court, 10) !== parseInt(b2.court, 10)) return false;
      const start1 = timeSlots.indexOf(b1.time_start);
      const end1 = timeSlots.indexOf(b1.time_end);
      const start2 = timeSlots.indexOf(b2.time_start);
      const end2 = timeSlots.indexOf(b2.time_end);
      return start1 < end2 && start2 < end1;
    };

    // Group overlapping bookings by court
    const courtBookings = new Map();
    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return;
      const court = parseInt(booking.court, 10);
      if (!courtBookings.has(court)) {
        courtBookings.set(court, []);
      }
      courtBookings.get(court).push(booking);
    });

    // For each court, find overlap groups and assign column indices
    const bookingColumns = new Map(); // booking_id -> { columnIndex, columnCount }

    courtBookings.forEach((courtBookingList, court) => {
      // Find all bookings that overlap with each booking
      const overlapGroups = [];

      courtBookingList.forEach((booking) => {
        // Find which groups this booking overlaps with
        let foundGroup = null;
        for (const group of overlapGroups) {
          if (group.some(b => bookingsOverlap(b, booking))) {
            foundGroup = group;
            break;
          }
        }

        if (foundGroup) {
          foundGroup.push(booking);
        } else {
          overlapGroups.push([booking]);
        }
      });

      // Merge groups that now overlap due to added bookings
      let merged = true;
      while (merged) {
        merged = false;
        for (let i = 0; i < overlapGroups.length; i++) {
          for (let j = i + 1; j < overlapGroups.length; j++) {
            const groupI = overlapGroups[i];
            const groupJ = overlapGroups[j];
            // Check if any booking in groupI overlaps with any in groupJ
            const overlaps = groupI.some(b1 => groupJ.some(b2 => bookingsOverlap(b1, b2)));
            if (overlaps) {
              // Merge groupJ into groupI
              overlapGroups[i] = [...groupI, ...groupJ];
              overlapGroups.splice(j, 1);
              merged = true;
              break;
            }
          }
          if (merged) break;
        }
      }

      // Assign column indices within each group
      overlapGroups.forEach((group) => {
        // Sort by start time for consistent ordering
        group.sort((a, b) => timeSlots.indexOf(a.time_start) - timeSlots.indexOf(b.time_start));

        // Find maximum concurrent overlaps in this group
        let maxConcurrent = 1;
        group.forEach((booking) => {
          const concurrent = group.filter(b => bookingsOverlap(b, booking)).length;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
        });

        // Assign columns using a greedy algorithm
        const assignedColumns = new Map();
        group.forEach((booking, idx) => {
          // Find the first available column
          const usedColumns = new Set();
          group.forEach((other) => {
            if (other.booking_id !== booking.booking_id && bookingsOverlap(booking, other)) {
              const col = assignedColumns.get(other.booking_id);
              if (col !== undefined) usedColumns.add(col);
            }
          });

          let column = 0;
          while (usedColumns.has(column)) column++;
          assignedColumns.set(booking.booking_id, column);

          bookingColumns.set(booking.booking_id, {
            columnIndex: column,
            columnCount: maxConcurrent,
          });
        });
      });
    });

    // Now build the slot map with consistent column info
    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return;

      const court = parseInt(booking.court, 10);
      const startTime = booking.time_start;
      const endTime = booking.time_end;

      const startIndex = timeSlots.indexOf(startTime);
      const endIndex = timeSlots.indexOf(endTime);
      const slotsSpanned = endIndex > startIndex ? endIndex - startIndex : 1;

      const columnInfo = bookingColumns.get(booking.booking_id) || { columnIndex: 0, columnCount: 1 };

      // Add to each slot this booking occupies
      for (let i = 0; i < slotsSpanned; i++) {
        const slotTime = timeSlots[startIndex + i];
        if (slotTime) {
          const key = `${court}-${slotTime}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key).push({
            booking,
            isFirstSlot: i === 0,
            slotsSpanned: i === 0 ? slotsSpanned : 0,
            overlapCount: columnInfo.columnCount,
            overlapIndex: columnInfo.columnIndex,
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
                  const cellDataArray = bookingMap.get(key);
                  const isSelected = isCellSelected(courtNum, timeIndex);
                  const closureInfo = !cellDataArray ? isSlotClosed(selectedDate, courtNum, time) : null;

                  return (
                    <div
                      key={time}
                      className="relative h-16 border-b border-gray-100"
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
