// useCourts Hook - Manage court data

const useCourts = () => {
    const [courts, setCourts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Load courts from API
    const loadCourts = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await SheetsApi.fetchData('courts');
            // Sort by display_order
            const sorted = data.sort((a, b) => {
                const orderA = parseInt(a.display_order) || 999;
                const orderB = parseInt(b.display_order) || 999;
                return orderA - orderB;
            });
            setCourts(sorted);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error loading courts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Get court by number
    const getCourtByNumber = React.useCallback((courtNumber) => {
        return courts.find(c => parseInt(c.court_number) === parseInt(courtNumber));
    }, [courts]);

    // Get court name
    const getCourtName = React.useCallback((courtNumber) => {
        const court = getCourtByNumber(courtNumber);
        if (court) return court.court_name;
        return parseInt(courtNumber) === 17 ? 'Stadium' : `Court ${courtNumber}`;
    }, [getCourtByNumber]);

    // Get available courts (status = 'available')
    const getAvailableCourts = React.useCallback(() => {
        return courts.filter(c => c.status === 'available' || c.status === 'open');
    }, [courts]);

    // Get courts under maintenance
    const getMaintenanceCourts = React.useCallback(() => {
        return courts.filter(c => c.status === 'maintenance');
    }, [courts]);

    // Get courts with lighting
    const getLitCourts = React.useCallback(() => {
        return courts.filter(c => c.lighting === 'TRUE' || c.lighting === 'true' || c.lighting === 'yes');
    }, [courts]);

    // Check if court is available
    const isCourtAvailable = React.useCallback((courtNumber) => {
        const court = getCourtByNumber(courtNumber);
        return court && (court.status === 'available' || court.status === 'open');
    }, [getCourtByNumber]);

    // Initial load
    React.useEffect(() => {
        loadCourts();
    }, [loadCourts]);

    // Generate default courts if none loaded (fallback)
    const courtsWithFallback = React.useMemo(() => {
        if (courts.length > 0) return courts;

        // Generate default 17 courts
        const defaultCourts = [];
        for (let i = 1; i <= 16; i++) {
            defaultCourts.push({
                court_number: String(i),
                court_name: `Court ${i}`,
                surface: 'hard',
                lighting: 'true',
                status: 'available',
                display_order: String(i)
            });
        }
        defaultCourts.push({
            court_number: '17',
            court_name: 'Stadium',
            surface: 'hard',
            lighting: 'true',
            status: 'available',
            display_order: '17'
        });
        return defaultCourts;
    }, [courts]);

    return {
        courts: courtsWithFallback,
        loading,
        error,
        getCourtByNumber,
        getCourtName,
        getAvailableCourts,
        getMaintenanceCourts,
        getLitCourts,
        isCourtAvailable,
        refresh: loadCourts
    };
};

// Make available globally
window.useCourts = useCourts;
