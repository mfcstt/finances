import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnlyLocal } from '@/lib/utils';

import type { Database } from '@/integrations/supabase/types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Reports() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    // Load last 6 months
    const start = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const getCategoryData = () => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  const getMonthlyData = () => {
    const monthlyData: Record<string, { income: number; expense: number; balance: number }> = {};

    transactions.forEach((t) => {
      const dt = parseDateOnlyLocal(t.date) || new Date(t.date);
      const month = format(dt, 'MMM/yy', { locale: ptBR });
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'income') {
        monthlyData[month].income += Number(t.amount);
      } else {
        monthlyData[month].expense += Number(t.amount);
      }
      monthlyData[month].balance = monthlyData[month].income - monthlyData[month].expense;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      Entradas: data.income,
      Saídas: data.expense,
      Saldo: data.balance,
    }));
  };

  const getComparisonData = () => {
    const currentMonth = new Date();
    const lastMonth = subMonths(currentMonth, 1);

    const getCurrentMonthData = () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthTransactions = transactions.filter(
        (t) => t.date >= start && t.date <= end
      );
      return {
        income: monthTransactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        expense: monthTransactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0),
      };
    };

    const getLastMonthData = () => {
      const start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      const monthTransactions = transactions.filter(
        (t) => t.date >= start && t.date <= end
      );
      return {
        income: monthTransactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0),
        expense: monthTransactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0),
      };
    };

    const current = getCurrentMonthData();
    const last = getLastMonthData();

    return [
      {
        month: format(lastMonth, 'MMM', { locale: ptBR }),
        Receitas: last.income,
        Despesas: last.expense,
      },
      {
        month: format(currentMonth, 'MMM', { locale: ptBR }),
        Receitas: current.income,
        Despesas: current.expense,
      },
    ];
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-28 lg:pb-0 overscroll-y-auto" style={{ touchAction: 'pan-y' }}>
        <div className="container mx-auto px-4 py-6 sm:p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Category Distribution */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getCategoryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) =>
                          `R$ ${Number(value).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Comparison */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Comparação Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) =>
                          `R$ ${Number(value).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}`
                        }
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="Despesas" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Evolution - Full Width */}
              <Card className="border-border/50 md:col-span-2">
                <CardHeader>
                  <CardTitle>Evolução do Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) =>
                          `R$ ${Number(value).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}`
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Saldo"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Entradas"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="Saídas"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
