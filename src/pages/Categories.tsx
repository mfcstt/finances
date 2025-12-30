import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { Tag, Plus, Edit, Trash2 } from 'lucide-react';
import CategoryDialog from '@/components/CategoryDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function Categories() {
  const { customCategories, createCategory, editCategory, deleteCategory, loadCombinedCategories, loading } = useCategories();
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const reload = async () => {
    const cats = await loadCombinedCategories();
    setCategories(cats);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCategories, user]);

  const handleCreate = async (name: string) => {
    createCategory(name);
    toast({ title: 'Categoria criada', description: name });
    await reload();
  };

  const handleEdit = async (newName: string) => {
    if (!editing) return;
    await editCategory(editing, newName);
    toast({ title: 'Categoria editada', description: `${editing} → ${newName}` });
    setEditing(null);
    await reload();
  };

  const handleDelete = async (name: string) => {
    deleteCategory(name);
    toast({ title: 'Categoria removida', description: name });
    await reload();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Categorias</h1>
              <p className="text-muted-foreground">Gerencie categorias usadas nas suas transações.</p>
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-1">
                <Plus className="h-3 w-3" />
                Nova Categoria
              </Button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-4">Carregando...</p>
                ) : categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma categoria encontrada.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((c) => {
                      const isCustom = customCategories.includes(c);
                      return (
                        <div key={c} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{c.charAt(0).toUpperCase() + c.slice(1)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setDialogOpen(true); }} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {isCustom && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} title="Remover" className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialName={editing ?? ''}
          onSave={(name) => (editing ? handleEdit(name) : handleCreate(name))}
          title={editing ? 'Editar Categoria' : 'Nova Categoria'}
        />
      </main>
    </div>
  );
}
