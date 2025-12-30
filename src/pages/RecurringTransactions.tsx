import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';
import { useRecurringTransactions, RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnlyLocal } from '@/lib/utils';


const categories = [
  'renda', 'casa', 'educação', 'beleza', 'transporte',
  'saúde', 'cartão', 'alimentação', 'lazer', 'trabalho', 'outros',
];

export default function RecurringTransactions() {
  const { 
    recurringTransactions, 
    loading, 
    createRecurringTransaction, 
    updateRecurringTransaction,
    deleteRecurringTransaction 
  } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [accountId, setAccountId] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [hasInstallments, setHasInstallments] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');

  const resetForm = () => {
    setType('expense');
    setDescription('');
    setCategory('');
    setAmount('');
    setDayOfMonth('');
    setAccountId('');
    setHasEndDate(false);
    setEndDate('');
    setHasInstallments(false);
    setTotalInstallments('');
    setEditingTransaction(null);
  };

  const handleOpenDialog = (transaction?: RecurringTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setType(transaction.type);
      setDescription(transaction.description);
      setCategory(transaction.category);
      setAmount(transaction.amount.toString());
      setDayOfMonth(transaction.day_of_month.toString());
      setAccountId(transaction.account_id || '');
      setHasEndDate(!!transaction.end_date);
      setEndDate(transaction.end_date || '');
      setHasInstallments(!!transaction.total_installments);
      setTotalInstallments(transaction.total_installments?.toString() || '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!description || !category || !amount || !dayOfMonth) {
      return;
    }

    if (editingTransaction) {
      // Atualizar transação existente
      await updateRecurringTransaction(editingTransaction.id, {
        type,
        description,
        category,
        amount: Number(amount),
        day_of_month: Number(dayOfMonth),
        account_id: accountId || null,
        end_date: hasEndDate && endDate ? endDate : null,
        total_installments: hasInstallments && totalInstallments ? Number(totalInstallments) : null,
      });
    } else {
      // Criar nova transação
      await createRecurringTransaction({
        type,
        description,
        category,
        amount: Number(amount),
        day_of_month: Number(dayOfMonth),
        account_id: accountId || null,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: hasEndDate && endDate ? endDate : null,
        is_active: true,
        total_installments: hasInstallments && totalInstallments ? Number(totalInstallments) : null,
      });
    }

    handleCloseDialog();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Card>
              <CardContent className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Transações Recorrentes</h1>
              <p className="text-muted-foreground">Gerencie suas transações que se repetem mensalmente</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Recorrente
            </Button>
          </div>

          {/* Transactions List */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Suas Transações Recorrentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recurringTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nenhuma transação recorrente cadastrada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adicione salários, contas fixas, assinaturas e outras transações que se repetem todo mês
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringTransactions.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-lg">{rt.description}</p>
                          <Badge variant={rt.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {rt.type === 'income' ? 'Entrada' : 'Saída'}
                          </Badge>
                          {rt.total_installments && (
                            <Badge variant="outline" className="text-xs">
                              {rt.current_installment}/{rt.total_installments}x
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span>Dia {rt.day_of_month}</span>
                          <span>•</span>
                          <span className="capitalize">{rt.category}</span>
                          {rt.end_date && (
                            <>
                              <span>•</span>
                              <span>até {format(parseDateOnlyLocal(rt.end_date) || new Date(rt.end_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </>
                          )}
                          {rt.account_id && accounts.find(a => a.id === rt.account_id) && (
                            <>
                              <span>•</span>
                              <span>{accounts.find(a => a.id === rt.account_id)?.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-xl font-bold ${rt.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                          {rt.type === 'income' ? '+' : '-'} R$ {rt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rt)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRecurringTransaction(rt.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction 
                ? 'Atualize os dados da transação recorrente'
                : 'Configure uma transação que se repete todo mês'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'income' | 'expense')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada (Receita)</SelectItem>
                  <SelectItem value="expense">Saída (Despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Salário, Aluguel, Netflix..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Dia do Mês</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  placeholder="15"
                />
              </div>

              {accounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasInstallments"
                  checked={hasInstallments}
                  onChange={(e) => setHasInstallments(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="hasInstallments">É parcelado</Label>
              </div>

              {hasInstallments && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="totalInstallments">Total de Parcelas</Label>
                  <Input
                    id="totalInstallments"
                    type="number"
                    min="1"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    placeholder="12"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasEndDate"
                  checked={hasEndDate}
                  onChange={(e) => setHasEndDate(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="hasEndDate">Tem data de término</Label>
              </div>

              {hasEndDate && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingTransaction ? 'Salvar Alterações' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

