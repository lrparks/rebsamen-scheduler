import { useState, useEffect, useCallback } from 'react';
import { fetchConfig } from '../utils/api.js';

/**
 * Hook for fetching facility config data
 */
export function useConfig() {
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConfig();
      setConfig(data);
    } catch (err) {
      console.error('[useConfig] Error:', err);
      setError(err.message || 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  /**
   * Get config value by key
   * @param {string} key
   * @returns {string|null}
   */
  const getConfigValue = useCallback((key) => {
    const item = config.find(c => c.key === key || c.setting === key);
    return item?.value || null;
  }, [config]);

  return {
    config,
    loading,
    error,
    refresh: loadConfig,
    getConfigValue,
  };
}
