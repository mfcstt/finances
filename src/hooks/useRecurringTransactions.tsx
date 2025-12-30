import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isBefore, isAfter, parseISO } from 'date-fns';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  description: string;
  category: string;
  amount: number;
  day_of_month: number;
  account_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  total_installments: number | null;
  current_installment: number;
  created_at: string;
  updated_at: string;
}

export function useRecurringTransactions() {
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecurringTransactions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('day_of_month', { ascending: true });

    if (error) {
      console.error('Error loading recurring transactions:', error);
    } else {
      setRecurringTransactions((data || []) as RecurringTransaction[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRecurringTransactions();
    }
  }, [user, loadRecurringTransactions]);

  const createRecurringTransaction = async (data: Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_installment'>) => {
    if (!user) return null;

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: user.id,
        ...data,
        current_installment: 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar transação recorrente', { description: error.message });
      return null;
    }

    toast.success('Transação recorrente criada!');
    loadRecurringTransactions();
    return result;
  };

  const updateRecurringTransaction = async (id: string, data: Partial<RecurringTransaction>) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update(data)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar', { description: error.message });
      return false;
    }

    toast.success('Atualizado com sucesso!');
    loadRecurringTransactions();
    return true;
  };

  const deleteRecurringTransaction = async (id: string) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover', { description: error.message });
    } else {
      toast.success('Removido com sucesso!');
      loadRecurringTransactions();
    }
  };

  // Generate pending transactions for a month
  const generateTransactionsForMonth = async (month: Date) => {
    if (!user) return [];

    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    // Check which recurring transactions already have entries for this month
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('recurring_transaction_id, date')
      .eq('user_id', user.id)
      .not('recurring_transaction_id', 'is', null)
      .gte('date', startStr)
      .lte('date', endStr);

    const existingRecurringIds = new Set(existingTransactions?.map(t => t.recurring_transaction_id));

    const transactionsToCreate = [];

    for (const recurring of recurringTransactions) {
      // Skip if already created for this month
      if (existingRecurringIds.has(recurring.id)) continue;

      // Check if recurring is active for this month
      const startDate = parseISO(recurring.start_date);
      if (isAfter(startDate, end)) continue;
      if (recurring.end_date && isBefore(parseISO(recurring.end_date), start)) continue;

      // Check installments
      if (recurring.total_installments && recurring.current_installment > recurring.total_installments) {
        continue;
      }

      // Calculate the date for this month
      const lastDayOfMonth = getDate(end);
      const dayOfMonth = Math.min(recurring.day_of_month, lastDayOfMonth);
      const transactionDate = new Date(month.getFullYear(), month.getMonth(), dayOfMonth);

      transactionsToCreate.push({
        user_id: user.id,
        type: recurring.type,
        description: recurring.total_installments 
          ? `${recurring.description} (${recurring.current_installment}/${recurring.total_installments})`
          : recurring.description,
        category: recurring.category,
        amount: recurring.amount,
        date: format(transactionDate, 'yyyy-MM-dd'),
        account_id: recurring.account_id,
        recurring_transaction_id: recurring.id,
        is_paid: false,
        due_date: format(transactionDate, 'yyyy-MM-dd'),
      });
    }

    if (transactionsToCreate.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToCreate)
        .select();

      if (error) {
        console.error('Error generating transactions:', error);
        return [];
      }

      // Update current_installment for installment-based recurring
      for (const recurring of recurringTransactions) {
        if (recurring.total_installments && transactionsToCreate.some(t => t.recurring_transaction_id === recurring.id)) {
          await supabase
            .from('recurring_transactions')
            .update({ current_installment: recurring.current_installment + 1 })
            .eq('id', recurring.id);
        }
      }

      return data || [];
    }

    return [];
  };

  return {
    recurringTransactions,
    loading,
    loadRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateTransactionsForMonth,
  };
}
