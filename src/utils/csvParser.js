/**
 * Parse CSV text into array of objects
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Object>} Array of row objects with header keys
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      const key = header.trim().toLowerCase().replace(/\s+/g, '_');
      let value = values[index] ? values[index].trim() : '';

      // Normalize date fields to YYYY-MM-DD format
      if (key === 'date' || key.endsWith('_date')) {
        value = normalizeDateFormat(value);
      }

      // Normalize time fields to HH:MM format
      if (key === 'time' || key.startsWith('time_') || key.endsWith('_time') || key.endsWith('_at')) {
        value = normalizeTimeFormat(value);
      }

      row[key] = value;
    });

    data.push(row);
  }

  return data;
}

/**
 * Normalize date string to YYYY-MM-DD format
 * Handles MM/DD/YYYY, M/D/YYYY, and YYYY-MM-DD formats
 * @param {string} dateStr - Date string in various formats
 * @returns {string} Date in YYYY-MM-DD format
 */
function normalizeDateFormat(dateStr) {
  if (!dateStr) return '';

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Handle MM/DD/YYYY or M/D/YYYY format
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Return original if format not recognized
  return dateStr;
}

/**
 * Normalize time string to HH:MM format
 * Handles various formats: H:MM, HH:MM, decimal (0.375 = 9:00), etc.
 * @param {string} timeStr - Time string in various formats
 * @returns {string} Time in HH:MM format
 */
function normalizeTimeFormat(timeStr) {
  if (!timeStr) return '';

  // Convert to string if not already
  const str = String(timeStr).trim();

  // Already in HH:MM or H:MM format
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  // Handle decimal format (Google Sheets stores times as fractions of a day)
  // e.g., 0.375 = 9:00 AM, 0.5 = 12:00 PM
  const decimal = parseFloat(str);
  if (!isNaN(decimal) && decimal >= 0 && decimal < 1) {
    const totalMinutes = Math.round(decimal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Handle 12-hour format with AM/PM
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let [, hours, minutes, period] = ampmMatch;
    let h = parseInt(hours, 10);
    if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
    if (period.toLowerCase() === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minutes}`;
  }

  // Return original if format not recognized
  return str;
}

/**
 * Parse a single CSV line handling quoted fields
 * @param {string} line - CSV line
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Fetch and parse CSV from URL
 * @param {string} url - CSV URL
 * @returns {Promise<Array<Object>>} Parsed data
 */
export async function fetchCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error('[fetchCSV] Error fetching:', url, error);
    throw error;
  }
}
