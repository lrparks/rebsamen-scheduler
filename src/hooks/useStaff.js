import { useState, useEffect, useCallback } from 'react';
import { fetchStaff } from '../utils/api.js';

/**
 * Hook for fetching staff list
 */
export function useStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStaff();
      // Filter to active staff only
      const activeStaff = data.filter(s =>
        s.is_active === 'TRUE' || s.is_active === true || s.is_active === '1'
      );
      setStaff(activeStaff);
    } catch (err) {
      console.error('[useStaff] Error:', err);
      setError(err.message || 'Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  /**
   * Get staff by initials
   * @param {string} initials
   * @returns {object|null}
   */
  const getStaffByInitials = useCallback((initials) => {
    return staff.find(s => s.initials === initials) || null;
  }, [staff]);

  /**
   * Staff options for dropdowns
   */
  const staffOptions = staff.map(s => ({
    value: s.staff_id,
    label: `${s.name} (${s.initials})`,
    initials: s.initials,
    name: s.name,
    role: s.role,
  }));

  return {
    staff,
    loading,
    error,
    refresh: loadStaff,
    getStaffByInitials,
    staffOptions,
  };
}
