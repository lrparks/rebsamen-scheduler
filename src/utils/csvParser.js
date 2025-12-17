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
      row[key] = values[index] ? values[index].trim() : '';
    });

    data.push(row);
  }

  return data;
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
