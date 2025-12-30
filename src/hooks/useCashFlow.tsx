import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRecurringTransactions, RecurringTransaction } from './useRecurringTransactions';
import { useAccounts } from './useAccounts';
import { format, startOfMonth, endOfMonth, getDate, parseISO, isAfter, isBefore } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export interface CashFlowItem {
  date: Date;
  dateStr: string;
  day: number;
  transactions: {
    id: string | null;
    description: string;
    category: string;
    type: 'income' | 'expense';
    amount: number;
    isRecurring: boolean;
    isPaid: boolean;
    dueDate?: string;
  }[];
  totalIncome: number;
  totalExpense: number;
  balanceBefore: number;
  balanceAfter: number;
}

export function useCashFlow(month?: Date) {
  const { user } = useAuth();
  const { recurringTransactions } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const lastCalculationRef = useRef<string>('');

  const calculateCashFlow = useCallback(async (targetMonth: Date) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const start = startOfMonth(targetMonth);
    const end = endOfMonth(targetMonth);
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    // Buscar transações já registradas do mês (por date ou due_date)
    // Buscar por date no mês
    const { data: transactionsByDate, error: error1 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr);

    // Buscar por due_date no mês (transações que vencem no mês)
    const { data: transactionsByDueDate, error: error2 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .gte('due_date', startStr)
      .lte('due_date', endStr);

    if (error1 || error2) {
      console.error('Error loading transactions:', error1 || error2);
      setLoading(false);
      return;
    }

    // Combinar e remover duplicatas
    const allTransactions = [
      ...(transactionsByDate || []),
      ...(transactionsByDueDate || []).filter(
        (t) => !(transactionsByDate || []).some((t2) => t2.id === t.id)
      ),
    ];

    // Criar mapa de transações por data (usando due_date se existir, senão date)
    const transactionsByDateMap = new Map<string, Transaction[]>();
    
    allTransactions.forEach((t) => {
      // Usar due_date se existir e estiver no mês, senão usar date
      const dateKey = t.due_date && 
        t.due_date >= startStr && 
        t.due_date <= endStr 
        ? t.due_date 
        : (t.date >= startStr && t.date <= endStr ? t.date : (t.due_date || t.date));
      
      // Só adicionar se a data estiver no mês
      if (dateKey >= startStr && dateKey <= endStr) {
        if (!transactionsByDateMap.has(dateKey)) {
          transactionsByDateMap.set(dateKey, []);
        }
        transactionsByDateMap.get(dateKey)!.push(t);
      }
    });

    // Adicionar transações recorrentes que ainda não foram geradas
    for (const recurring of recurringTransactions) {
      const startDate = parseISO(recurring.start_date);
      if (isAfter(startDate, end)) continue;
      if (recurring.end_date && isBefore(parseISO(recurring.end_date), start)) continue;
      if (recurring.total_installments && recurring.current_installment > recurring.total_installments) continue;

      const lastDayOfMonth = getDate(end);
      const dayOfMonth = Math.min(recurring.day_of_month, lastDayOfMonth);
      const transactionDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), dayOfMonth);
      const dateKey = format(transactionDate, 'yyyy-MM-dd');

      // Verificar se já existe transação gerada para esta recorrente neste mês
      const alreadyExists = allTransactions.some(
        (t) => t.recurring_transaction_id === recurring.id && (t.due_date || t.date) === dateKey
      );

      if (!alreadyExists) {
        if (!transactionsByDateMap.has(dateKey)) {
          transactionsByDateMap.set(dateKey, []);
        }
        // Adicionar como transação pendente (não paga)
        transactionsByDateMap.get(dateKey)!.push({
          id: null,
          user_id: user.id,
          type: recurring.type,
          description: recurring.description,
          category: recurring.category,
          amount: recurring.amount,
          date: dateKey,
          due_date: dateKey,
          is_paid: false,
          payment_method: null,
          account_id: recurring.account_id,
          recurring_transaction_id: recurring.id,
          created_at: null,
        } as Transaction);
      }
    }

    // Converter para array e ordenar por data
    const sortedDates = Array.from(transactionsByDateMap.keys()).sort();

    // Calcular fluxo de caixa
    // Começar com o saldo total das contas como saldo inicial
    const initialBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    let runningBalance = initialBalance;
    const cashFlowItems: CashFlowItem[] = [];

    for (const dateStr of sortedDates) {
      const date = parseISO(dateStr);
      const day = getDate(date);
      const transactions = transactionsByDateMap.get(dateStr) || [];

      const dayTransactions = transactions.map((t) => ({
        id: t.id,
        description: t.description,
        category: t.category,
        type: t.type as 'income' | 'expense',
        amount: Number(t.amount),
        isRecurring: !!t.recurring_transaction_id,
        isPaid: t.is_paid || false,
        dueDate: t.due_date || undefined,
      }));

      const totalIncome = dayTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = dayTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const balanceBefore = runningBalance;
      runningBalance = runningBalance + totalIncome - totalExpense;
      const balanceAfter = runningBalance;

      cashFlowItems.push({
        date,
        dateStr,
        day,
        transactions: dayTransactions,
        totalIncome,
        totalExpense,
        balanceBefore,
        balanceAfter,
      });
    }

    setCashFlow(cashFlowItems);
    setLoading(false);
  }, [user, recurringTransactions, accounts]);

  // Calcular automaticamente quando month for fornecido
  useEffect(() => {
    if (!month || !user) return;
    
    const monthKey = format(month, 'yyyy-MM');
    const recurringKey = recurringTransactions.map(t => `${t.id}-${t.day_of_month}-${t.amount}`).join(',');
    const accountsKey = accounts.map(a => `${a.id}-${a.balance}`).join(',');
    const calculationKey = `${monthKey}-${recurringKey}-${accountsKey}`;
    
    // Só recalcular se algo mudou
    if (lastCalculationRef.current !== calculationKey) {
      lastCalculationRef.current = calculationKey;
      calculateCashFlow(month);
    }
  }, [month, user, recurringTransactions, accounts, calculateCashFlow]);

  return {
    cashFlow,
    loading,
    calculateCashFlow,
  };
}

