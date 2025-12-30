import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session) {
        // Check if user has initial transactions, if not create them
        setTimeout(() => {
          checkAndCreateInitialTransactions(session.user.id);
        }, 0);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    }
    return { error };
  };

  const checkAndCreateInitialTransactions = async (userId: string) => {
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existingTransactions || existingTransactions.length === 0) {
      const initialTransactions = [
        {
          user_id: userId,
          type: 'income',
          description: 'Salário - parte 1',
          amount: 960,
          category: 'renda',
          payment_method: 'trabalho',
          date: '2025-11-15',
        },
        {
          user_id: userId,
          type: 'income',
          description: 'Salário - parte 2',
          amount: 1310,
          category: 'renda',
          payment_method: 'trabalho',
          date: '2025-11-31',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Ajuda em casa',
          amount: 300,
          category: 'casa',
          payment_method: 'pix',
          date: '2025-11-15',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Curso Rocketseat',
          amount: 197,
          category: 'educação',
          payment_method: 'cartão',
          date: '2025-11-15',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Unha',
          amount: 150,
          category: 'beleza',
          payment_method: 'dinheiro',
          date: '2025-11-15',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Carona',
          amount: 70,
          category: 'transporte',
          payment_method: 'pix',
          date: '2025-11-15',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Academia',
          amount: 99,
          category: 'saúde',
          payment_method: 'débito',
          date: '2025-11-01',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Fatura PicPay',
          amount: 145,
          category: 'cartão',
          payment_method: 'picpay',
          date: '2025-11-31',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Cabelo',
          amount: 250,
          category: 'beleza',
          payment_method: 'dinheiro',
          date: '2025-11-05',
        },
        {
          user_id: userId,
          type: 'expense',
          description: 'Fatura Nubank',
          amount: 495,
          category: 'cartão',
          payment_method: 'nubank',
          date: '2025-11-31',
        },
      ];

      await supabase.from('transactions').insert(initialTransactions);
    }
  };

  return {
    user,
    session,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
