import { createContext, useContext, useState, useEffect } from 'react';

const StaffContext = createContext(null);

const STORAGE_KEY = 'rebsamen-current-staff';

/**
 * Staff Context Provider
 * Manages current staff selection with localStorage persistence
 */
export function StaffProvider({ children }) {
  const [currentStaff, setCurrentStaff] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCurrentStaff(JSON.parse(stored));
      } catch (e) {
        console.error('[StaffContext] Error parsing stored staff:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when staff changes
  useEffect(() => {
    if (isLoaded && currentStaff) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStaff));
    }
  }, [currentStaff, isLoaded]);

  const selectStaff = (staff) => {
    setCurrentStaff(staff);
  };

  const clearStaff = () => {
    setCurrentStaff(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = {
    currentStaff,
    isLoaded,
    selectStaff,
    clearStaff,
    initials: currentStaff?.initials || '',
    name: currentStaff?.name || '',
  };

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

/**
 * Hook to access staff context
 */
export function useStaffContext() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaffContext must be used within a StaffProvider');
  }
  return context;
}
