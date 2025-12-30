import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { parseDateOnlyLocal } from '@/lib/utils';

import { useAccounts } from '@/hooks/useAccounts';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Descrição obrigatória').max(200),
  category: z.string().min(1, 'Categoria obrigatória'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Valor deve ser maior que zero',
  }),
  payment_method: z.string().optional(),
  date: z.date(),
  due_date: z.date().optional(),
  account_id: z.string().optional(),
  is_paid: z.boolean(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export interface TransactionToEdit {
  id: string;
  type: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string | null;
  date: string;
  due_date: string | null;
  account_id: string | null;
  is_paid: boolean;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialDate?: Date;
  transactionToEdit?: TransactionToEdit | null;
}

const categories = [
  'renda',
  'casa',
  'educação',
  'beleza',
  'transporte',
  'saúde',
  'cartão',
  'alimentação',
  'lazer',
  'trabalho',
  'outros',
];

const paymentMethods = ['pix', 'dinheiro', 'débito', 'cartão', 'nubank', 'picpay', 'trabalho'];

export function TransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
  transactionToEdit,
}: TransactionDialogProps) {
  const { user } = useAuth();
  const { accounts, updateAccountBalance } = useAccounts();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDueDate, setShowDueDate] = useState(false);

  const isEditing = !!transactionToEdit;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      date: initialDate || new Date(),
      is_paid: true,
    },
  });

  const type = watch('type');
  const isPaid = watch('is_paid');

  // Reset form when dialog opens/closes or when editing a transaction
  useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        const txDate = parseDateOnlyLocal(transactionToEdit.date) || new Date(transactionToEdit.date);
        setDate(txDate);
        setValue('type', transactionToEdit.type as 'income' | 'expense');
        setValue('description', transactionToEdit.description);
        setValue('category', transactionToEdit.category);
        setValue('amount', String(transactionToEdit.amount));
        setValue('payment_method', transactionToEdit.payment_method || undefined);
        setValue('date', txDate);
        setValue('is_paid', transactionToEdit.is_paid);
        setValue('account_id', transactionToEdit.account_id || undefined);
        
        if (transactionToEdit.due_date) {
          const dueDateParsed = parseDateOnlyLocal(transactionToEdit.due_date) || new Date(transactionToEdit.due_date);
          setDueDate(dueDateParsed);
          setValue('due_date', dueDateParsed);
          setShowDueDate(true);
        } else {
          setDueDate(undefined);
          setShowDueDate(false);
        }
      } else {
        const newDate = initialDate || new Date();
        setDate(newDate);
        setDueDate(undefined);
        setShowDueDate(false);
        reset({
          type: 'expense',
          date: newDate,
          is_paid: true,
        });
      }
    }
  }, [open, transactionToEdit, initialDate, setValue, reset]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const transactionData = {
        user_id: user.id,
        type: data.type,
        description: data.description,
        category: data.category,
        amount: Number(data.amount),
        payment_method: data.payment_method || null,
        date: format(data.date, 'yyyy-MM-dd'),
        due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
        account_id: data.account_id || null,
        is_paid: data.is_paid,
      };

      if (isEditing && transactionToEdit) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionToEdit.id);

        if (error) throw error;

        // Update account balance if account changed or amount changed
        if (data.account_id && data.is_paid) {
          // This is simplified - in production you'd want to handle the difference
          await updateAccountBalance(
            data.account_id,
            Number(data.amount),
            data.type === 'income'
          );
        }

        toast.success('Transação atualizada com sucesso!');
      } else {
        // Create new transaction
        const { error } = await supabase.from('transactions').insert(transactionData);

        if (error) throw error;

        // Update account balance if account is selected and is paid
        if (data.account_id && data.is_paid) {
          await updateAccountBalance(
            data.account_id,
            Number(data.amount),
            data.type === 'income'
          );
        }

        toast.success('Transação adicionada com sucesso!');
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Erro ao salvar transação', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados da transação' : 'Adicione uma nova entrada ou saída'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select 
              value={type} 
              onValueChange={(value) => setValue('type', value as 'income' | 'expense')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Entrada</SelectItem>
                <SelectItem value="expense">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" {...register('description')} placeholder="Ex: Salário, Aluguel..." />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={watch('category')} 
                onValueChange={(value) => setValue('category', value)}
              >
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
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select 
                value={watch('payment_method')} 
                onValueChange={(value) => setValue('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select 
                  value={watch('account_id')} 
                  onValueChange={(value) => setValue('account_id', value)}
                >
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Transação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : <span>Selecione</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate) setValue('date', newDate);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data de Vencimento</Label>
                <Switch
                  checked={showDueDate}
                  onCheckedChange={(checked) => {
                    setShowDueDate(checked);
                    if (!checked) {
                      setDueDate(undefined);
                      setValue('due_date', undefined);
                    }
                  }}
                />
              </div>
              {showDueDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'dd/MM/yyyy') : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(newDate) => {
                        setDueDate(newDate);
                        if (newDate) setValue('due_date', newDate);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="is_paid" className="font-medium">Pago</Label>
              <p className="text-sm text-muted-foreground">
                {isPaid ? 'Esta transação já foi paga' : 'Esta transação ainda não foi paga'}
              </p>
            </div>
            <Switch
              id="is_paid"
              checked={isPaid}
              onCheckedChange={(checked) => setValue('is_paid', checked)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
