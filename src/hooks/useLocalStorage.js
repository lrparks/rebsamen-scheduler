import { useState, useEffect } from 'react';

/**
 * Hook for syncing state with localStorage
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value if not in storage
 * @returns {[*, function]} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // Get initial value from storage or use provided default
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      if (storedValue === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error writing ${key}:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
