import { useState, useEffect, useCallback } from 'react';
import { fetchCourts } from '../utils/api.js';
import { CONFIG } from '../config.js';

/**
 * Hook for fetching and managing courts data
 */
export function useCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCourts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourts();
      // Sort by display order
      const sorted = data.sort((a, b) =>
        (parseInt(a.display_order, 10) || 0) - (parseInt(b.display_order, 10) || 0)
      );
      setCourts(sorted);
    } catch (err) {
      console.error('[useCourts] Error:', err);
      setError(err.message || 'Failed to fetch courts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  /**
   * Get court by number
   * @param {number} courtNumber
   * @returns {object|null}
   */
  const getCourtByNumber = useCallback((courtNumber) => {
    return courts.find(c => parseInt(c.court_number, 10) === courtNumber) || null;
  }, [courts]);

  /**
   * Get court name
   * @param {number} courtNumber
   * @returns {string}
   */
  const getCourtName = useCallback((courtNumber) => {
    if (courtNumber === CONFIG.STADIUM_COURT_NUMBER) {
      return 'Stadium';
    }
    const court = getCourtByNumber(courtNumber);
    return court?.court_name || `Court ${courtNumber}`;
  }, [getCourtByNumber]);

  /**
   * Get all court options for dropdowns
   */
  const courtOptions = courts.map(c => ({
    value: parseInt(c.court_number, 10),
    label: c.court_name || `Court ${c.court_number}`,
    status: c.status,
  }));

  return {
    courts,
    loading,
    error,
    refresh: loadCourts,
    getCourtByNumber,
    getCourtName,
    courtOptions,
  };
}
