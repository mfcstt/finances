import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, ArrowRightLeft, Trash2, Star } from 'lucide-react';
import { useAccounts, Account } from '@/hooks/useAccounts';
import { toast } from 'sonner';

export function AccountsManager() {
  const { accounts, loading, createAccount, deleteAccount, transferBetweenAccounts, getTotalBalance } = useAccounts();
  const [newAccountDialogOpen, setNewAccountDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountIsPrimary, setNewAccountIsPrimary] = useState(false);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error('Nome da conta é obrigatório');
      return;
    }
    await createAccount(newAccountName, Number(newAccountBalance) || 0, newAccountIsPrimary);
    setNewAccountDialogOpen(false);
    setNewAccountName('');
    setNewAccountBalance('');
    setNewAccountIsPrimary(false);
  };

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount || !transferAmount) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (fromAccount === toAccount) {
      toast.error('Selecione contas diferentes');
      return;
    }
    const success = await transferBetweenAccounts(fromAccount, toAccount, Number(transferAmount));
    if (success) {
      setTransferDialogOpen(false);
      setFromAccount('');
      setToAccount('');
      setTransferAmount('');
    }
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
     

      {/* New Account Dialog */}
      <Dialog open={newAccountDialogOpen} onOpenChange={setNewAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta</DialogTitle>
            <DialogDescription>Adicione uma conta bancária ou carteira</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Nome da Conta</Label>
              <Input
                id="accountName"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Ex: Nubank, PicPay, Carteira..."
              />
            </div>
          
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={newAccountIsPrimary}
                onChange={(e) => setNewAccountIsPrimary(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPrimary">Conta principal</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewAccountDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCreateAccount} className="flex-1">
                Criar Conta
              </Button>
            </div>
        
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir entre Contas</DialogTitle>
            <DialogDescription>Mova dinheiro de uma conta para outra</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>De</Label>
              <Select value={fromAccount} onValueChange={setFromAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} - R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Para</Label>
              <Select value={toAccount} onValueChange={setToAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} - R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferAmount">Valor (R$)</Label>
              <Input
                id="transferAmount"
                type="number"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleTransfer} className="flex-1">
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
