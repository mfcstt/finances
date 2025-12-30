import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Check, Clock, CheckCircle2, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TransactionDialog, TransactionToEdit } from '@/components/TransactionDialog';
import { MonthNavigator } from '@/components/MonthNavigator';
import { useMonthFilter } from '@/contexts/MonthFilterContext';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { parseDateOnlyLocal } from '@/lib/utils';


type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function Transactions() {
  const { user } = useAuth();
  const { startDate, endDate } = useMonthFilter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionToEdit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'date' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, startDate, endDate]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter, methodFilter, categoryFilter, sortBy, sortOrder]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Buscar por date no mês
    const { data: dataByDate, error: error1 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr);

    // Buscar por due_date no mês (transações que vencem no mês)
    const { data: dataByDueDate, error: error2 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .gte('due_date', startStr)
      .lte('due_date', endStr);

    if (error1 || error2) {
      setLoading(false);
      return;
    }

    // Combinar e remover duplicatas (prioriza a entrada existente)
    const all = [
      ...(dataByDate || []),
      ...(dataByDueDate || []).filter((t) => !(dataByDate || []).some((d) => d.id === t.id)),
    ];

    // Ordenar por data efetiva: due_date quando presente, senão date
    all.sort((a, b) => {
      const aDate = (parseDateOnlyLocal(a.due_date || a.date) || new Date(a.due_date || a.date)).getTime();
      const bDate = (parseDateOnlyLocal(b.due_date || b.date) || new Date(b.due_date || b.date)).getTime();
      return bDate - aDate; // desc
    });

    setTransactions(all as Transaction[]);
    setLoading(false);
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter((t) => t.payment_method === methodFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Ordenação
    if (sortBy === 'amount') {
      filtered.sort((a, b) => {
        const amountA = Number(a.amount);
        const amountB = Number(b.amount);
        return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
      });
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = (parseDateOnlyLocal(a.date) || new Date(a.date)).getTime();
        const dateB = (parseDateOnlyLocal(b.date) || new Date(b.date)).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    setFilteredTransactions(filtered);
  };

  const handleSortByAmount = () => {
    if (sortBy === 'amount') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('amount');
      setSortOrder('desc');
    }
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao deletar transação');
    } else {
      toast.success('Transação deletada com sucesso');
      loadTransactions();
    }
  };

  const togglePaidStatus = async (transaction: Transaction) => {
    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: !transaction.is_paid })
      .eq('id', transaction.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(transaction.is_paid ? 'Transação marcada como pendente' : 'Transação marcada como paga');
      loadTransactions();
    }
  };

  const payAllPending = async () => {
    const pendingTransactions = filteredTransactions.filter(t => !t.is_paid);
    
    if (pendingTransactions.length === 0) {
      toast.info('Não há transações pendentes');
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .update({ is_paid: true })
      .in('id', pendingTransactions.map(t => t.id));

    if (error) {
      toast.error('Erro ao marcar transações como pagas');
    } else {
      toast.success(`${pendingTransactions.length} transação(ões) marcada(s) como paga(s)`);
      loadTransactions();
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit({
      id: transaction.id,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      amount: Number(transaction.amount),
      payment_method: transaction.payment_method,
      date: transaction.date,
      due_date: transaction.due_date,
      account_id: transaction.account_id,
      is_paid: transaction.is_paid,
    });
    setDialogOpen(true);
  };

  const handleNewTransaction = () => {
    setTransactionToEdit(null);
    setDialogOpen(true);
  };

  const paymentMethods = Array.from(
    new Set(transactions.map((t) => t.payment_method).filter(Boolean))
  );

  const categories = Array.from(
    new Set(transactions.map((t) => t.category))
  ).sort();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-28 lg:pb-0 overscroll-y-auto" style={{ touchAction: 'pan-y' }}>
        <div className="container mx-auto px-4 py-6 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Transações</h1>
              <p className="text-muted-foreground">Gerencie todas as suas movimentações financeiras</p>
            </div>
            <div className="flex items-center gap-4">
              <MonthNavigator />
              <Button onClick={handleNewTransaction} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Transação
              </Button>
            </div>
          </div>

       

          {/* Table */}
          <Card>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhuma transação encontrada
              </div>
            ) : (
              <>
                {filteredTransactions.some(t => !t.is_paid) && (
                  <div className="p-4 border-b border-border">
                    <Button
                      variant="outline"
                      onClick={payAllPending}
                      className="gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Pagar Todas as Pendentes
                    </Button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="h-8 w-auto min-w-[120px] border-none shadow-none hover:bg-accent px-2">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">Categoria</span>
                              {categoryFilter !== 'all' && (
                                <Filter className="h-3 w-3 text-primary" />
                              )}
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSortByAmount}
                        className="h-8 gap-1 hover:bg-transparent"
                      >
                        Valor
                        {sortBy === 'amount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div>{format(parseISO(transaction.date), 'dd/MM/yyyy')}</div>
                          {transaction.due_date && (
                            <div className="text-xs text-muted-foreground">
                              Venc: {format(parseISO(transaction.due_date), 'dd/MM')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">{transaction.description}</TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[120px] truncate">
                        {transaction.payment_method?.charAt(0).toUpperCase() +
                          transaction.payment_method?.slice(1)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.is_paid ? 'default' : 'outline'}
                          className={transaction.is_paid ? 'bg-green-500/10 text-green-500' : 'text-yellow-500 border-yellow-500'}
                        >
                          {transaction.is_paid ? (
                            <><Check className="h-3 w-3 mr-1" /> Pago</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'} R${' '}
                        {Number(transaction.amount).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!transaction.is_paid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePaidStatus(transaction)}
                              className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                              title="Marcar como paga"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {transaction.is_paid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePaidStatus(transaction)}
                              className="h-8 w-8 text-yellow-500 hover:bg-yellow-500/10"
                              title="Marcar como pendente"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(transaction)}
                            className="h-8 w-8"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTransaction(transaction.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadTransactions}
        transactionToEdit={transactionToEdit}
      />
    </div>
  );
}
