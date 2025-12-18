import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchClosures } from '../utils/api.js';
import { normalizeTime } from '../utils/dateHelpers.js';

/**
 * Hook for fetching and managing court closures data
 *
 * CSV Expected Columns:
 * - date: YYYY-MM-DD format
 * - court: court number (1-17) or "all" for all courts
 * - time_start: HH:MM format or "00:00" for full day
 * - time_end: HH:MM format or "21:00" for full day
 * - reason: text description
 * - is_active: TRUE/FALSE
 */
export function useClosures() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadClosures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchClosures();
      // Filter to active closures only
      const activeClosures = data.filter(c => c.is_active === 'TRUE');
      setClosures(activeClosures);
    } catch (err) {
      console.error('[useClosures] Error:', err);
      setError(err.message || 'Failed to fetch closures');
      setClosures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClosures();
  }, [loadClosures]);

  /**
   * Check if a specific slot is closed
   * @param {string} date - YYYY-MM-DD format
   * @param {number} court - Court number
   * @param {string} time - HH:MM format
   * @returns {{ isClosed: boolean, reason: string | null }}
   */
  const isSlotClosed = useCallback((date, court, time) => {
    const timeMinutes = parseTimeToMinutes(time);

    for (const closure of closures) {
      // Check date match
      if (closure.date !== date) continue;

      // Check court match (specific court or "all")
      const closureCourt = closure.court?.toLowerCase();
      if (closureCourt !== 'all' && parseInt(closureCourt, 10) !== court) continue;

      // Check time overlap
      const startMinutes = parseTimeToMinutes(closure.time_start || '00:00');
      const endMinutes = parseTimeToMinutes(closure.time_end || '21:00');

      if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
        return { isClosed: true, reason: closure.reason || 'Closed' };
      }
    }

    return { isClosed: false, reason: null };
  }, [closures]);

  /**
   * Get all closures for a specific date
   * @param {string} date - YYYY-MM-DD format
   * @returns {Array}
   */
  const getClosuresForDate = useCallback((date) => {
    return closures.filter(c => c.date === date);
  }, [closures]);

  /**
   * Check if any part of a time range is closed
   * @param {string} date
   * @param {number} court
   * @param {string} timeStart
   * @param {string} timeEnd
   * @returns {{ isClosed: boolean, reason: string | null }}
   */
  const isRangeClosed = useCallback((date, court, timeStart, timeEnd) => {
    const startMinutes = parseTimeToMinutes(timeStart);
    const endMinutes = parseTimeToMinutes(timeEnd);

    for (const closure of closures) {
      if (closure.date !== date) continue;

      const closureCourt = closure.court?.toLowerCase();
      if (closureCourt !== 'all' && parseInt(closureCourt, 10) !== court) continue;

      const closureStart = parseTimeToMinutes(closure.time_start || '00:00');
      const closureEnd = parseTimeToMinutes(closure.time_end || '21:00');

      // Check overlap
      if (startMinutes < closureEnd && endMinutes > closureStart) {
        return { isClosed: true, reason: closure.reason || 'Closed' };
      }
    }

    return { isClosed: false, reason: null };
  }, [closures]);

  return {
    closures,
    loading,
    error,
    refresh: loadClosures,
    isSlotClosed,
    isRangeClosed,
    getClosuresForDate,
  };
}

/**
 * Parse time string to minutes since midnight
 * @param {string|number} time - HH:MM format or decimal
 * @returns {number}
 */
function parseTimeToMinutes(time) {
  if (!time && time !== 0) return 0;
  const normalized = normalizeTime(time);
  if (!normalized || typeof normalized !== 'string' || !normalized.includes(':')) return 0;
  const parts = normalized.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}
