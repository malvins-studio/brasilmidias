import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { User } from '@/types';

/**
 * Hook para gerenciar o role do usuário
 * 
 * Permite:
 * - Verificar se o usuário é owner ou client
 * - Atualizar o role do usuário
 * - Criar documento de usuário se não existir
 */
export function useUserRole() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca o documento do usuário no Firestore
   * Se não existir, cria um novo com role 'client'
   */
  const fetchUserRole = async () => {
    if (!user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // Usuário já existe, retorna os dados
        setUserRole({
          id: userSnap.id,
          ...userSnap.data(),
        } as User);
      } else {
        // Usuário não existe, cria um novo com role 'client'
        const newUser: Omit<User, 'id'> = {
          email: user.email || '',
          role: 'client',
          createdAt: Timestamp.now(),
        };

        await setDoc(userRef, newUser);

        setUserRole({
          id: user.uid,
          ...newUser,
        } as User);
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao buscar role do usuário');
      console.error('Error fetching user role:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza o role do usuário
   * @param newRole Novo role ('client' ou 'owner')
   */
  const updateRole = async (newRole: 'client' | 'owner') => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: Timestamp.now(),
      });

      // Atualiza o estado local
      if (userRole) {
        setUserRole({
          ...userRole,
          role: newRole,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Se não tinha userRole, busca novamente
        await fetchUserRole();
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao atualizar role');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica se o usuário é owner
   */
  const isOwner = userRole?.role === 'owner';

  /**
   * Verifica se o usuário é client
   */
  const isClient = userRole?.role === 'client';

  /**
   * Verifica se o usuário é super admin
   */
  const isSuperAdmin = userRole?.isSuperAdmin === true;

  // Busca o role quando o usuário muda
  useEffect(() => {
    if (user) {
      fetchUserRole();
    } else {
      setUserRole(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // Usa user.uid para evitar re-renders desnecessários

  return {
    userRole,
    loading,
    error,
    isOwner,
    isClient,
    isSuperAdmin,
    updateRole,
    refetch: fetchUserRole,
  };
}

