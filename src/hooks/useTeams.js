import { useState, useEffect, useCallback } from 'react';
import { fetchTeams } from '../utils/api.js';

/**
 * Hook for fetching teams data
 */
export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeams();
      setTeams(data);
    } catch (err) {
      console.error('[useTeams] Error:', err);
      setError(err.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  /**
   * Get team by ID
   * @param {string} teamId
   * @returns {object|null}
   */
  const getTeamById = useCallback((teamId) => {
    return teams.find(t => t.team_id === teamId) || null;
  }, [teams]);

  /**
   * Get active teams (is_active=TRUE and within season dates)
   */
  const activeTeams = teams.filter(t => {
    // Check is_active flag
    if (t.is_active === 'FALSE' || t.is_active === false) return false;

    // Check season dates if provided
    if (!t.season_start || !t.season_end) return true;
    const now = new Date();
    const start = new Date(t.season_start);
    const end = new Date(t.season_end);
    return now >= start && now <= end;
  });

  /**
   * Team options for dropdowns
   * Maps CSV columns: name, organization, phone (not team_name, school_name, contact_phone)
   */
  const teamOptions = teams.map(t => ({
    value: t.team_id,
    label: t.name || t.team_name, // CSV uses 'name', fallback to 'team_name'
    type: t.team_type,
    school: t.organization || t.school_name, // CSV uses 'organization'
    contact: t.contact_name,
    phone: t.phone || t.contact_phone, // CSV uses 'phone'
  }));

  return {
    teams,
    activeTeams,
    loading,
    error,
    refresh: loadTeams,
    getTeamById,
    teamOptions,
  };
}
