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
   * Get active teams (is_active=TRUE) - shows all regardless of season
   */
  const activeTeams = useMemo(() => {
    return teams.filter(t => {
      // Check is_active flag only
      if (t.is_active === 'FALSE' || t.is_active === false) return false;
      return true;
    });
  }, [teams]);

  /**
   * Check if a team is currently in season
   * @param {object} team
   * @returns {boolean}
   */
  const isInSeason = useCallback((team) => {
    if (!team.season_start || !team.season_end) return true;
    const now = new Date();
    const start = new Date(team.season_start);
    const end = new Date(team.season_end);
    return now >= start && now <= end;
  }, []);

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
    isInSeason,
  };
}
