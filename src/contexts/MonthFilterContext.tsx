import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface MonthFilterContextType {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  startDate: Date;
  endDate: Date;
}

const MonthFilterContext = createContext<MonthFilterContextType | undefined>(undefined);

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  // Force initial month to be at least Jan 2026
  const MIN_MONTH = startOfMonth(new Date(2026, 0, 1));
  const now = startOfMonth(new Date());
  const initialMonth = now < MIN_MONTH ? MIN_MONTH : now;

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  const goToPreviousMonth = () => setCurrentMonth((prev) => {
    const prevMonth = subMonths(prev, 1);
    return prevMonth < MIN_MONTH ? MIN_MONTH : prevMonth;
  });
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToCurrentMonth = () => setCurrentMonth(now < MIN_MONTH ? MIN_MONTH : now);

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  return (
    <MonthFilterContext.Provider
      value={{
        currentMonth,
        setCurrentMonth,
        goToPreviousMonth,
        goToNextMonth,
        goToCurrentMonth,
        startDate,
        endDate,
      }}
    >
      {children}
    </MonthFilterContext.Provider>
  );
}

export function useMonthFilter() {
  const context = useContext(MonthFilterContext);
  if (context === undefined) {
    throw new Error('useMonthFilter must be used within a MonthFilterProvider');
  }
  return context;
}
