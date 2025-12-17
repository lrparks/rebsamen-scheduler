import { useState, useEffect, useCallback } from 'react';
import { fetchContractors } from '../utils/api.js';

/**
 * Hook for fetching contractors data
 */
export function useContractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadContractors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContractors();
      // Filter to active contractors
      const active = data.filter(c =>
        c.status === 'active' || c.is_active === 'TRUE' || c.is_active === true
      );
      setContractors(active);
    } catch (err) {
      console.error('[useContractors] Error:', err);
      setError(err.message || 'Failed to fetch contractors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  /**
   * Get contractor by ID
   * @param {string} contractorId
   * @returns {object|null}
   */
  const getContractorById = useCallback((contractorId) => {
    return contractors.find(c => c.contractor_id === contractorId) || null;
  }, [contractors]);

  /**
   * Contractor options for dropdowns
   */
  const contractorOptions = contractors.map(c => ({
    value: c.contractor_id,
    label: c.business_name || c.name,
    name: c.name,
    phone: c.phone,
    email: c.email,
  }));

  return {
    contractors,
    loading,
    error,
    refresh: loadContractors,
    getContractorById,
    contractorOptions,
  };
}
