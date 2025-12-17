// useStaff Hook - Manage staff data and current staff selection

const useStaff = () => {
    const [staff, setStaff] = React.useState([]);
    const [currentStaff, setCurrentStaff] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Load staff list from API
    const loadStaff = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await SheetsApi.fetchData('staff');
            // Filter to active staff only
            const activeStaff = data.filter(s => s.is_active === 'TRUE' || s.is_active === 'true' || s.is_active === true);
            setStaff(activeStaff);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error loading staff:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load current staff from localStorage
    const loadCurrentStaff = React.useCallback(() => {
        const saved = localStorage.getItem('rebsamen_current_staff');
        if (saved) {
            try {
                setCurrentStaff(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing saved staff:', e);
                localStorage.removeItem('rebsamen_current_staff');
            }
        }
    }, []);

    // Select staff member
    const selectStaff = React.useCallback((staffMember) => {
        setCurrentStaff(staffMember);
        if (staffMember) {
            localStorage.setItem('rebsamen_current_staff', JSON.stringify(staffMember));
        } else {
            localStorage.removeItem('rebsamen_current_staff');
        }
    }, []);

    // Clear staff selection
    const clearStaff = React.useCallback(() => {
        setCurrentStaff(null);
        localStorage.removeItem('rebsamen_current_staff');
    }, []);

    // Get staff by ID
    const getStaffById = React.useCallback((staffId) => {
        return staff.find(s => s.staff_id === staffId);
    }, [staff]);

    // Get staff initials
    const getStaffInitials = React.useCallback((staffId) => {
        const member = getStaffById(staffId);
        return member ? member.initials : staffId;
    }, [getStaffById]);

    // Initial load
    React.useEffect(() => {
        loadStaff();
        loadCurrentStaff();
    }, [loadStaff, loadCurrentStaff]);

    return {
        staff,
        currentStaff,
        loading,
        error,
        selectStaff,
        clearStaff,
        getStaffById,
        getStaffInitials,
        refresh: loadStaff
    };
};

// Make available globally
window.useStaff = useStaff;
