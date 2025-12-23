import { useState, useEffect, useCallback } from 'react';
import { fetchTournaments } from '../utils/api.js';

/**
 * Hook for fetching tournaments data
 *
 * TOURNAMENTS CSV STRUCTURE:
 * ========================
 * Required columns for the Google Sheets "Tournaments" tab:
 *
 * | Column          | Type    | Description                                    | Example                    |
 * |-----------------|---------|------------------------------------------------|----------------------------|
 * | tournament_id   | string  | Unique identifier (auto-generated or manual)   | TOURN-2025-001            |
 * | name            | string  | Tournament name                                | Spring Classic            |
 * | organizer       | string  | Organization or person running tournament      | Little Rock Tennis Assoc  |
 * | contact_name    | string  | Primary contact person                         | John Smith                |
 * | contact_phone   | string  | Contact phone number                           | (501) 555-1234            |
 * | contact_email   | string  | Contact email                                  | john@example.com          |
 * | start_date      | date    | Tournament start date (YYYY-MM-DD)             | 2025-03-15                |
 * | end_date        | date    | Tournament end date (YYYY-MM-DD)               | 2025-03-17                |
 * | default_courts  | string  | Comma-separated court numbers                  | 1,2,3,4,5,6               |
 * | status          | string  | active, completed, cancelled                   | active                    |
 * | notes           | string  | Additional notes                               | USTA sanctioned event     |
 * | created_at      | datetime| When record was created                        | 2025-01-15T10:30:00       |
 *
 * To set up:
 * 1. Create a new sheet tab named "Tournaments" in your Google Sheet
 * 2. Add the column headers in row 1
 * 3. Publish the sheet: File > Share > Publish to web > Select "Tournaments" tab > CSV format
 * 4. Copy the URL and add it to config.js under CSV_URLS.tournaments
 */
export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTournaments();
      console.log('[useTournaments] Raw tournament data:', data);
      setTournaments(data);
    } catch (err) {
      console.error('[useTournaments] Error:', err);
      setError(err.message || 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  /**
   * Get tournament by ID
   * @param {string} tournamentId
   * @returns {object|null}
   */
  const getTournamentById = useCallback((tournamentId) => {
    return tournaments.find(t => t.tournament_id === tournamentId) || null;
  }, [tournaments]);

  /**
   * Get active tournaments (status=active and within date range)
   */
  const activeTournaments = tournaments.filter(t => {
    if (t.status === 'cancelled' || t.status === 'completed') return false;

    // If end_date is provided, check if tournament hasn't ended
    if (t.end_date) {
      const endDate = new Date(t.end_date + 'T23:59:59');
      if (endDate < new Date()) return false;
    }

    return true;
  });

  /**
   * Get upcoming tournaments (starting in the future or currently running)
   */
  const upcomingTournaments = tournaments.filter(t => {
    console.log('[useTournaments] Checking tournament:', t.name, 'Status:', t.status, 'End date:', t.end_date);

    if (t.status === 'cancelled') {
      console.log('[useTournaments] Filtered out (cancelled):', t.name);
      return false;
    }

    // Check if tournament end date hasn't passed
    if (t.end_date) {
      const endDate = new Date(t.end_date + 'T23:59:59');
      const now = new Date();
      console.log('[useTournaments] End date check:', t.name, 'endDate:', endDate, 'now:', now, 'has passed:', endDate < now);
      if (endDate < now) {
        console.log('[useTournaments] Filtered out (past):', t.name);
        return false;
      }
    }

    console.log('[useTournaments] Included in upcoming:', t.name);
    return true;
  }).sort((a, b) => {
    // Sort by start date
    return (a.start_date || '').localeCompare(b.start_date || '');
  });

  /**
   * Tournament options for dropdowns
   */
  const tournamentOptions = activeTournaments.map(t => ({
    value: t.tournament_id,
    label: t.name,
    organizer: t.organizer,
    contact: t.contact_name,
    phone: t.contact_phone,
    startDate: t.start_date,
    endDate: t.end_date,
  }));

  return {
    tournaments,
    activeTournaments,
    upcomingTournaments,
    loading,
    error,
    refresh: loadTournaments,
    getTournamentById,
    tournamentOptions,
  };
}
