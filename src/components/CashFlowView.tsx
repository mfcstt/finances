import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCashFlow } from '@/hooks/useCashFlow';
import { useMonthFilter } from '@/contexts/MonthFilterContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, DollarSign } from 'lucide-react';

export function CashFlowView() {
  const { startDate } = useMonthFilter();
  const { cashFlow, loading } = useCashFlow(startDate);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (cashFlow.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma transação encontrada para este mês
          </p>
        </CardContent>
      </Card>
    );
  }

  // Verificar se há saldo negativo
  const hasNegativeBalance = cashFlow.some((item) => item.balanceAfter < 0);
  const firstNegativeDay = cashFlow.find((item) => item.balanceAfter < 0);

  // Calcular totais do mês
  const totalIncome = cashFlow.reduce((sum, item) => sum + item.totalIncome, 0);
  const totalExpense = cashFlow.reduce((sum, item) => sum + item.totalExpense, 0);
  const finalBalance = cashFlow[cashFlow.length - 1]?.balanceAfter || 0;
  const initialBalance = cashFlow[0]?.balanceBefore || 0;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total do mês</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Total do mês</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              R$ {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Saldo após todas as transações</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Fluxo de Caixa Mensal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        {hasNegativeBalance && firstNegativeDay && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Saldo Negativo</AlertTitle>
            <AlertDescription>
              Você ficará com saldo negativo no dia {format(firstNegativeDay.date, 'dd/MM', { locale: ptBR })}. 
              Saldo previsto: R$ {firstNegativeDay.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. 
              Revise seus gastos ou planeje uma entrada adicional.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {cashFlow.map((item) => (
            <div
              key={item.dateStr}
              className={`rounded-lg border p-4 ${
                item.balanceAfter < 0
                  ? 'border-red-500/50 bg-red-500/5'
                  : item.balanceAfter < 100
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-border/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">
                      Dia {item.day} - {format(item.date, 'EEEE', { locale: ptBR })}
                    </h3>
                    {item.balanceAfter < 0 && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Negativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(item.date, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Saldo Após</div>
                  <div
                    className={`text-lg font-bold ${
                      item.balanceAfter >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    R$ {item.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  {item.balanceBefore !== initialBalance && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Saldo antes: R$ {item.balanceBefore.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {item.transactions.map((transaction, idx) => (
                  <div
                    key={transaction.id || `recurring-${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-background/50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.description}</span>
                          {transaction.isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              Recorrente
                            </Badge>
                          )}
                          {!transaction.isPaid && (
                            <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                          {transaction.isPaid && (
                            <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Pago
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{transaction.category}</span>
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'} R${' '}
                      {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>

              {(item.totalIncome > 0 || item.totalExpense > 0) && (
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-sm">
                  <div className="flex gap-4">
                    {item.totalIncome > 0 && (
                      <div className="text-green-500">
                        <span className="text-muted-foreground">Entradas: </span>
                        <span className="font-semibold">
                          + R$ {item.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {item.totalExpense > 0 && (
                      <div className="text-red-500">
                        <span className="text-muted-foreground">Saídas: </span>
                        <span className="font-semibold">
                          - R$ {item.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    Saldo do dia: {item.totalIncome - item.totalExpense >= 0 ? '+' : ''}
                    R$ {(item.totalIncome - item.totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    </>
  );
}

