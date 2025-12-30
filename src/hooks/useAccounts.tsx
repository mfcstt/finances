import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error loading accounts:', error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user, loadAccounts]);

  const createAccount = async (name: string, initialBalance: number = 0, isPrimary: boolean = false) => {
    if (!user) return null;

    // If setting as primary, unset other primaries first
    if (isPrimary) {
      await supabase
        .from('accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name,
        balance: initialBalance,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar conta', { description: error.message });
      return null;
    }

    toast.success('Conta criada com sucesso!');
    loadAccounts();
    return data;
  };

  const updateAccountBalance = async (accountId: string, amount: number, isIncome: boolean) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const newBalance = isIncome ? account.balance + amount : account.balance - amount;

    const { error } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId);

    if (error) {
      console.error('Error updating account balance:', error);
    } else {
      loadAccounts();
    }
  };

  const deleteAccount = async (accountId: string) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      toast.error('Erro ao deletar conta', { description: error.message });
    } else {
      toast.success('Conta deletada com sucesso!');
      loadAccounts();
    }
  };

  const transferBetweenAccounts = async (fromAccountId: string, toAccountId: string, amount: number) => {
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);

    if (!fromAccount || !toAccount) {
      toast.error('Contas não encontradas');
      return false;
    }

    if (fromAccount.balance < amount) {
      toast.error('Saldo insuficiente');
      return false;
    }

    const { error: error1 } = await supabase
      .from('accounts')
      .update({ balance: fromAccount.balance - amount })
      .eq('id', fromAccountId);

    const { error: error2 } = await supabase
      .from('accounts')
      .update({ balance: toAccount.balance + amount })
      .eq('id', toAccountId);

    if (error1 || error2) {
      toast.error('Erro ao transferir');
      return false;
    }

    toast.success('Transferência realizada!');
    loadAccounts();
    return true;
  };

  const getTotalBalance = () => accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const getPrimaryAccount = () => accounts.find(a => a.is_primary);

  return {
    accounts,
    loading,
    loadAccounts,
    createAccount,
    updateAccountBalance,
    deleteAccount,
    transferBetweenAccounts,
    getTotalBalance,
    getPrimaryAccount,
  };
}
