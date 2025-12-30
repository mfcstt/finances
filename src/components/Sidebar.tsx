import { NavLink, useLocation } from 'react-router-dom';
import { Home, Receipt, Calendar, BarChart3, Settings, LogOut, Wallet, RefreshCw, Tag, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

const navigation = [
  { name: 'Visão Geral', href: '/dashboard', icon: Home },
  { name: 'Transações', href: '/transactions', icon: Receipt },
  { name: 'Recorrentes', href: '/recurring', icon: RefreshCw },
  { name: 'Calendário', href: '/calendar', icon: Calendar },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Categorias', href: '/categories', icon: Tag },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop / large screens sidebar */}
      <div className="hidden lg:flex h-screen w-64 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold">Finanças</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </div>

      {/* Mobile bottom nav + drawer trigger */}
      <div className="lg:hidden">
        <div className="fixed bottom-3 left-3 right-3 z-50 rounded-lg bg-card border border-border px-3 py-2 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <nav className="flex flex-1 justify-between">
              {navigation.slice(0, 4).map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 px-2 py-1 text-xs',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="truncate w-16 text-[10px]">{item.name}</span>
                </NavLink>
              ))}
            </nav>

            {/* Drawer trigger for full nav */}
            <div className="ml-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Navegação</DrawerTitle>
                    <DrawerDescription>Escolha onde navegar</DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 space-y-2">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </NavLink>
                    ))}
                  </div>

                  <DrawerFooter>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-5 w-5" />
                      Sair
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
