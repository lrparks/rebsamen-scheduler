import { CONFIG } from '../config.js';
import { fetchCSV } from './csvParser.js';

/**
 * Call Apps Script API
 * @param {string} action - Action name
 * @param {object} data - Request data
 * @returns {Promise<object>} Response data
 */
export async function callAppsScript(action, data) {
  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });

    const result = await response.json();
    console.log(`[API] ${action}:`, result);
    return result;
  } catch (error) {
    console.error(`[API] ${action} error:`, error);
    throw error;
  }
}

/**
 * Create a new booking
 * @param {object|Array<object>} booking - Booking data (single or array for multi-court)
 * @returns {Promise<object>}
 */
export async function createBooking(booking) {
  return callAppsScript('createBooking', { booking });
}

/**
 * Update an existing booking
 * @param {string} bookingId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateBooking(bookingId, updates) {
  return callAppsScript('updateBooking', { bookingId, updates });
}

/**
 * Check in a booking
 * @param {string} bookingId
 * @param {string} staffInitials
 * @returns {Promise<object>}
 */
export async function checkInBooking(bookingId, staffInitials) {
  return callAppsScript('checkIn', { bookingId, staffInitials });
}

/**
 * Cancel a booking
 * @param {string} bookingId
 * @param {object} cancelData - { reason, refund_status, refund_amount, refund_note, cancelled_by }
 * @returns {Promise<object>}
 */
export async function cancelBooking(bookingId, cancelData) {
  return callAppsScript('cancelBooking', { bookingId, cancelData });
}

/**
 * Mark a booking as no-show
 * @param {string} bookingId
 * @param {string} staffInitials
 * @returns {Promise<object>}
 */
export async function markNoShow(bookingId, staffInitials) {
  return callAppsScript('markNoShow', { bookingId, staffInitials });
}

/**
 * Log a maintenance entry
 * @param {object} logEntry
 * @returns {Promise<object>}
 */
export async function logMaintenance(logEntry) {
  return callAppsScript('logMaintenance', { logEntry });
}

/**
 * Fetch bookings data
 * @returns {Promise<Array>}
 */
export async function fetchBookings() {
  const data = await fetchCSV(CONFIG.CSV_URLS.bookings);
  console.log('[API] Fetched bookings:', data.length);
  return data;
}

/**
 * Fetch courts data
 * @returns {Promise<Array>}
 */
export async function fetchCourts() {
  const data = await fetchCSV(CONFIG.CSV_URLS.courts);
  console.log('[API] Fetched courts:', data.length);
  return data;
}

/**
 * Fetch staff data
 * @returns {Promise<Array>}
 */
export async function fetchStaff() {
  const data = await fetchCSV(CONFIG.CSV_URLS.staff);
  console.log('[API] Fetched staff:', data.length);
  return data;
}

/**
 * Fetch config data
 * @returns {Promise<Array>}
 */
export async function fetchConfig() {
  const data = await fetchCSV(CONFIG.CSV_URLS.config);
  console.log('[API] Fetched config:', data.length);
  return data;
}

/**
 * Fetch contractors data
 * @returns {Promise<Array>}
 */
export async function fetchContractors() {
  const data = await fetchCSV(CONFIG.CSV_URLS.contractors);
  console.log('[API] Fetched contractors:', data.length);
  return data;
}

/**
 * Fetch teams data
 * @returns {Promise<Array>}
 */
export async function fetchTeams() {
  const data = await fetchCSV(CONFIG.CSV_URLS.teams);
  console.log('[API] Fetched teams:', data.length);
  return data;
}

/**
 * Fetch maintenance log data
 * @returns {Promise<Array>}
 */
export async function fetchMaintenanceLog() {
  const data = await fetchCSV(CONFIG.CSV_URLS.maintenanceLog);
  console.log('[API] Fetched maintenance log:', data.length);
  return data;
}

/**
 * Fetch tournaments data
 * @returns {Promise<Array>}
 */
export async function fetchTournaments() {
  const data = await fetchCSV(CONFIG.CSV_URLS.tournaments);
  console.log('[API] Fetched tournaments:', data.length);
  return data;
}

// ============================================
// TEAM CRUD OPERATIONS
// ============================================

/**
 * Create a new team
 * @param {object} team - Team data
 * @returns {Promise<object>}
 */
export async function createTeam(team) {
  return callAppsScript('createTeam', { team });
}

/**
 * Update an existing team
 * @param {string} teamId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateTeam(teamId, updates) {
  return callAppsScript('updateTeam', { teamId, updates });
}

/**
 * Delete a team (soft delete - sets is_active to FALSE)
 * @param {string} teamId
 * @returns {Promise<object>}
 */
export async function deleteTeam(teamId) {
  return callAppsScript('deleteTeam', { teamId });
}

// ============================================
// TOURNAMENT CRUD OPERATIONS
// ============================================

/**
 * Create a new tournament
 * @param {object} tournament - Tournament data
 * @returns {Promise<object>}
 */
export async function createTournament(tournament) {
  return callAppsScript('createTournament', { tournament });
}

/**
 * Update an existing tournament
 * @param {string} tournamentId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateTournament(tournamentId, updates) {
  return callAppsScript('updateTournament', { tournamentId, updates });
}

/**
 * Delete/cancel a tournament
 * @param {string} tournamentId
 * @returns {Promise<object>}
 */
export async function deleteTournament(tournamentId) {
  return callAppsScript('deleteTournament', { tournamentId });
}

// ============================================
// CONTRACTOR CRUD OPERATIONS
// ============================================

/**
 * Create a new contractor
 * @param {object} contractor - Contractor data
 * @returns {Promise<object>}
 */
export async function createContractor(contractor) {
  return callAppsScript('createContractor', { contractor });
}

/**
 * Update an existing contractor
 * @param {string} contractorId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateContractor(contractorId, updates) {
  return callAppsScript('updateContractor', { contractorId, updates });
}

/**
 * Delete a contractor (soft delete - sets is_active to FALSE)
 * @param {string} contractorId
 * @returns {Promise<object>}
 */
export async function deleteContractor(contractorId) {
  return callAppsScript('deleteContractor', { contractorId });
}
