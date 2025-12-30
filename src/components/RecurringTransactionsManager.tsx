import { useState } from 'react';
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
import { Plus, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { useRecurringTransactions, RecurringTransaction } from '@/hooks/useRecurringTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnlyLocal } from '@/lib/utils';

const categories = [
  'renda', 'casa', 'educação', 'beleza', 'transporte',
  'saúde', 'cartão', 'alimentação', 'lazer', 'trabalho', 'outros',
];

export function RecurringTransactionsManager() {
  const { recurringTransactions, loading, createRecurringTransaction, deleteRecurringTransaction } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);

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
  };

  const handleCreate = async () => {
    if (!description || !category || !amount || !dayOfMonth) {
      return;
    }

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

    setDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Transações Recorrentes
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
            <Plus className="h-3 w-3" />
            Nova Recorrente
          </Button>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma transação recorrente. Adicione salários, contas fixas, etc.
            </p>
          ) : (
            <div className="space-y-3">
              {recurringTransactions.map((rt) => (
                <div
                  key={rt.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{rt.description}</p>
                      <Badge variant={rt.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                        {rt.type === 'income' ? 'Entrada' : 'Saída'}
                      </Badge>
                      {rt.total_installments && (
                        <Badge variant="outline" className="text-xs">
                          {rt.current_installment}/{rt.total_installments}x
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dia {rt.day_of_month} • {rt.category}
                      {rt.end_date && ` • até ${format(parseDateOnlyLocal(rt.end_date) || new Date(rt.end_date), 'dd/MM/yyyy')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-lg font-bold ${rt.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      R$ {rt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
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

      {/* New Recurring Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Transação Recorrente</DialogTitle>
            <DialogDescription>
              Configure uma transação que se repete todo mês
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
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreate} className="flex-1">
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
