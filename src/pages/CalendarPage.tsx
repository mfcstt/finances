import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { parseDateOnlyLocal } from '@/lib/utils';

import { TransactionDialog } from '@/components/TransactionDialog';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, currentMonth]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
    const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  };

  const getTransactionsForDay = (day: Date) => {
    return transactions.filter((t) => {
      const txDate = parseDateOnlyLocal(t.date);
      return txDate ? isSameDay(txDate, day) : false;
    });
  };


  const getDayTotal = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    return dayTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
    }, 0);
  };

  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentMonth)) {
      setSelectedDate(day);
      setDayDialogOpen(true);
    }
  };

  const handleAddTransaction = () => {
    setDayDialogOpen(false);
    setDialogOpen(true);
  };

  const days = getDaysInMonth();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-28 lg:pb-0 overscroll-y-auto" style={{ touchAction: 'pan-y' }}>
        <div className="container mx-auto px-4 py-6 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Calendário</h1>
              <p className="text-muted-foreground">Visualize suas transações por dia</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[200px] text-center text-lg font-semibold">
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <Card className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile: list view for better readability */}
                <div className="space-y-2 sm:hidden">
                  {days.map((day) => {
                    const dayTransactions = getTransactionsForDay(day);
                    const dayTotal = getDayTotal(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => handleDayClick(day)}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-colors ${
                          isCurrentMonth ? 'bg-card border border-border' : 'bg-muted/20 text-muted-foreground'
                        } ${isToday ? 'ring-2 ring-primary' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded flex items-center justify-center font-medium ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
                            {dayTransactions.length > 0 && (
                              <div className="text-xs text-muted-foreground">{dayTransactions.length} transação{dayTransactions.length > 1 ? 's' : ''}</div>
                            )}
                          </div>
                        </div>

                        <div className={`text-sm font-semibold whitespace-nowrap ${dayTotal > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {dayTotal !== 0 ? (dayTotal > 0 ? '+' : '') + dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop/Tablet: month grid */}
                <div className="hidden sm:block">
                  {/* Week days header */}
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((day) => {
                      const dayTransactions = getTransactionsForDay(day);
                      const dayTotal = getDayTotal(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <button
                          key={day.toString()}
                          onClick={() => handleDayClick(day)}
                          className={`group relative min-h-[100px] rounded-lg border p-2 text-left transition-colors hover:border-primary ${
                            isCurrentMonth
                              ? 'border-border bg-card'
                              : 'border-transparent bg-muted/30 text-muted-foreground'
                          } ${isToday ? 'ring-2 ring-primary' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                              {format(day, 'd')}
                            </span>
                            {dayTransactions.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {dayTransactions.length}
                              </Badge>
                            )}
                          </div>

                          {dayTransactions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {dayTransactions.slice(0, 2).map((t) => (
                                <div
                                  key={t.id}
                                  className={`truncate text-xs ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}
                                >
                                  {t.description}
                                </div>
                              ))}
                              {dayTransactions.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{dayTransactions.length - 2} mais
                                </div>
                              )}
                            </div>
                          )}

                          {dayTotal !== 0 && (
                            <div className="absolute bottom-2 right-2">
                              <span
                                className={`text-xs font-semibold ${
                                  dayTotal > 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                {dayTotal > 0 ? '+' : ''}
                                {dayTotal.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Day Details Dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>Transações do dia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && getTransactionsForDay(selectedDate).length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">Nenhuma transação neste dia</p>
            ) : (
              <div className="space-y-2">
                {selectedDate &&
                  getTransactionsForDay(selectedDate).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                    >
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-muted-foreground">{t.category}</p>
                      </div>
                      <p
                        className={`font-semibold ${
                          t.type === 'income' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'} R${' '}
                        {Number(t.amount).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  ))}
              </div>
            )}
            <Button onClick={handleAddTransaction} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Transação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadTransactions}
        initialDate={selectedDate || undefined}
      />
    </div>
  );
}
