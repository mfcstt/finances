import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMonthFilter } from '@/contexts/MonthFilterContext';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MonthNavigator() {
  const { currentMonth, goToPreviousMonth, goToNextMonth, goToCurrentMonth } = useMonthFilter();
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        className="min-w-[180px] justify-center font-semibold"
        onClick={goToCurrentMonth}
      >
        {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
      </Button>
      
      <Button variant="outline" size="icon" onClick={goToNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button variant="secondary" size="sm" onClick={goToCurrentMonth} className="gap-1 ml-2">
          <CalendarDays className="h-3 w-3" />
          Hoje
        </Button>
      )}
    </div>
  );
}
