import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTeams } from '../utils/api.js';

/**
 * Hook for fetching teams data
 *
 * Handles various CSV column naming conventions:
 * - name OR team_name
 * - type OR team_type
 * - organization OR school_name
 * - phone OR contact_phone
 */
export function useTeams() {
  const [rawTeams, setRawTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeams();
      setRawTeams(data);
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
   * Normalize team data to handle various CSV column naming conventions
   */
  const teams = useMemo(() => {
    return rawTeams.map(t => ({
      ...t,
      // Normalize common field variations
      team_name: t.team_name || t.name || '',
      team_type: t.team_type || t.type || '', // CSV might use 'type' instead of 'team_type'
      school_name: t.school_name || t.organization || '',
      contact_phone: t.contact_phone || t.phone || '',
    }));
  }, [rawTeams]);

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
  const activeTeams = useMemo(() => {
    return teams.filter(t => {
      // Check is_active flag
      if (t.is_active === 'FALSE' || t.is_active === false) return false;

      // Check season dates if provided
      if (!t.season_start || !t.season_end) return true;
      const now = new Date();
      const start = new Date(t.season_start);
      const end = new Date(t.season_end);
      return now >= start && now <= end;
    });
  }, [teams]);

  /**
   * Team options for dropdowns
   */
  const teamOptions = useMemo(() => {
    return teams.map(t => ({
      value: t.team_id,
      label: t.team_name,
      type: t.team_type,
      school: t.school_name,
      contact: t.contact_name,
      phone: t.contact_phone,
    }));
  }, [teams]);

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
