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
   * Get active teams (within season dates)
   */
  const activeTeams = teams.filter(t => {
    if (!t.season_start || !t.season_end) return true;
    const now = new Date();
    const start = new Date(t.season_start);
    const end = new Date(t.season_end);
    return now >= start && now <= end;
  });

  /**
   * Team options for dropdowns grouped by type
   */
  const teamOptions = teams.map(t => ({
    value: t.team_id,
    label: t.team_name,
    type: t.team_type,
    school: t.school_name,
    contact: t.contact_name,
    phone: t.contact_phone,
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
