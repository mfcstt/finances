import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TransactionDialog } from '@/components/TransactionDialog';
import { MonthNavigator } from '@/components/MonthNavigator';
import { AccountsManager } from '@/components/AccountsManager';
import { CashFlowView } from '@/components/CashFlowView';
import { useMonthFilter } from '@/contexts/MonthFilterContext';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { parseDateOnlyLocal } from '@/lib/utils';


type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Dashboard() {
  const { user } = useAuth();
  const { startDate, endDate } = useMonthFilter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    const start = format(startDate, 'yyyy-MM-dd');
    const end = format(endDate, 'yyyy-MM-dd');

    try {
      // Query única que busca transações cujo date OU due_date cai no mês
      const orFilter = `(and(date.gte.${start},date.lte.${end})),(and(due_date.gte.${start},due_date.lte.${end}))`;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .or(orFilter);

      if (error) {
        console.error('Erro ao carregar transações no dashboard:', error);
        setTransactions([]);
        calculateStats([]);
        setLoading(false);
        return;
      }

      const rows: Transaction[] = data || [];

      // Ordenar por data efetiva: due_date quando presente, senão date (desc)
      rows.sort((a, b) => {
        const aDate = (parseDateOnlyLocal((a.due_date || a.date) as string) || new Date((a.due_date || a.date) as string)).getTime();
        const bDate = (parseDateOnlyLocal((b.due_date || b.date) as string) || new Date((b.due_date || b.date) as string)).getTime();
        return bDate - aDate;
      });

      setTransactions(rows);
      calculateStats(rows);
    } catch (err) {
      console.error('Unexpected error loading dashboard transactions:', err);
      setTransactions([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Transaction[]) => {
    const income = data
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = data
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      balance: income - expense,
      income,
      expense,
    });
  };

  const getCategoryData = () => {
    const categoryTotals = transactions.reduce((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        acc[t.category].income += Number(t.amount);
      } else {
        acc[t.category].expense += Number(t.amount);
      }
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    return Object.entries(categoryTotals).map(([category, totals]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      Entradas: totals.income,
      Saídas: totals.expense,
    }));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-28 lg:pb-0 overscroll-y-auto" style={{ touchAction: 'pan-y' }}>
        <div className="container mx-auto px-4 py-6 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Visão Geral</h1>
            <div className="flex items-center gap-4">
              <MonthNavigator />
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Transação
              </Button>
            </div>
          </div>

          {/* Accounts Manager */}
          <AccountsManager />


          {/* Cash Flow View */}
          <CashFlowView />

         

         
        </div>
      </main>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadTransactions}
      />
    </div>
  );
}
