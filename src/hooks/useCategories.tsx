import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('categories');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        setCustomCategories(parsed);
      } catch {
        setCustomCategories([]);
      }
    }
  }, []);

  const persist = (cats: string[]) => {
    setCustomCategories(cats);
    localStorage.setItem('categories', JSON.stringify(cats));
  };

  const createCategory = (name: string) => {
    if (!name) return;
    const normalized = name.trim().toLowerCase();
    if (!normalized) return;
    if (customCategories.includes(normalized)) return;
    persist([...customCategories, normalized]);
  };

  const editCategory = async (oldName: string, newName: string) => {
    const oldN = oldName.trim().toLowerCase();
    const newN = newName.trim().toLowerCase();
    if (!oldN || !newN) return;

    // Update custom categories list
    const updated = customCategories.map((c) => (c === oldN ? newN : c));
    if (!updated.includes(newN)) updated.push(newN);
    persist(Array.from(new Set(updated)));

    // Update existing transactions in Supabase that reference the old category
    if (user) {
      await supabase
        .from('transactions')
        .update({ category: newN })
        .eq('user_id', user.id)
        .eq('category', oldN);
    }
  };

  const deleteCategory = async (name: string) => {
    const n = name.trim().toLowerCase();
    persist(customCategories.filter((c) => c !== n));
    // We intentionally don't delete or change transactions here
  };

  const loadCombinedCategories = useCallback(async (): Promise<string[]> => {
    setLoading(true);
    let remote: string[] = [];
    if (user) {
      const { data } = await supabase
        .from('transactions')
        .select('category')
        .eq('user_id', user.id);

      if (data && Array.isArray(data)) {
        remote = Array.from(new Set(data.map((d: any) => (d.category || '').toLowerCase()).filter(Boolean)));
      }
    }

    const combined = Array.from(new Set([...remote, ...customCategories]));
    combined.sort();
    setLoading(false);
    return combined;
  }, [user, customCategories]);

  return {
    customCategories,
    createCategory,
    editCategory,
    deleteCategory,
    loadCombinedCategories,
    loading,
  };
}

export type UseCategories = ReturnType<typeof useCategories>;
