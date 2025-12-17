// useConfig Hook - Manage configuration data

const useConfig = () => {
    const [config, setConfig] = React.useState({});
    const [contractors, setContractors] = React.useState([]);
    const [teams, setTeams] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Load config from API
    const loadConfig = React.useCallback(async () => {
        try {
            setLoading(true);

            // Fetch config, contractors, and teams in parallel
            const [configData, contractorsData, teamsData] = await Promise.all([
                SheetsApi.fetchData('config'),
                SheetsApi.fetchData('contractors'),
                SheetsApi.fetchData('teams')
            ]);

            // Convert config array to object (key-value pairs)
            const configObj = {};
            configData.forEach(row => {
                if (row.key) {
                    configObj[row.key] = row.value;
                }
            });
            setConfig(configObj);

            // Filter active contractors
            const activeContractors = contractorsData.filter(
                c => c.is_active === 'TRUE' || c.is_active === 'true' || c.is_active === true
            );
            setContractors(activeContractors);

            // Filter active teams
            const activeTeams = teamsData.filter(
                t => t.is_active === 'TRUE' || t.is_active === 'true' || t.is_active === true
            );
            setTeams(activeTeams);

            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error loading config:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Get config value with default
    const getConfigValue = React.useCallback((key, defaultValue = null) => {
        return config[key] !== undefined ? config[key] : defaultValue;
    }, [config]);

    // Get contractor by ID
    const getContractorById = React.useCallback((contractorId) => {
        return contractors.find(c => c.contractor_id === contractorId);
    }, [contractors]);

    // Get team by ID
    const getTeamById = React.useCallback((teamId) => {
        return teams.find(t => t.team_id === teamId);
    }, [teams]);

    // Get teams by type
    const getTeamsByType = React.useCallback((type) => {
        return teams.filter(t => t.team_type === type);
    }, [teams]);

    // Get entity name (for display)
    const getEntityName = React.useCallback((bookingType, entityId) => {
        if (!entityId) return '';

        if (bookingType === 'contractor') {
            const contractor = getContractorById(entityId);
            return contractor ? contractor.name : entityId;
        }

        if (bookingType.startsWith('team_')) {
            const team = getTeamById(entityId);
            return team ? team.name : entityId;
        }

        return entityId;
    }, [getContractorById, getTeamById]);

    // Initial load
    React.useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    return {
        config,
        contractors,
        teams,
        loading,
        error,
        getConfigValue,
        getContractorById,
        getTeamById,
        getTeamsByType,
        getEntityName,
        refresh: loadConfig
    };
};

// Make available globally
window.useConfig = useConfig;
