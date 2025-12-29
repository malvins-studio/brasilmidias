import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  getDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import { Media } from '@/types';

/**
 * Remove campos undefined de um objeto (recursivamente)
 * Firestore não aceita undefined, então precisamos removê-los antes de salvar
 */
function removeUndefinedFields(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Pula campos undefined
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) {
      // Recursivamente limpa objetos aninhados
      const cleanedNested = removeUndefinedFields(value as Record<string, unknown>);
      // Só adiciona se o objeto aninhado não estiver vazio
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Hook para gerenciar mídias do owner
 * Permite criar, editar, deletar (exclusão lógica) e listar mídias do owner
 */
export function useOwnerMidias() {
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole(); // Para pegar o companyId
  const [midias, setMidias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca todas as mídias da company do owner logado
   * IMPORTANTE: As mídias são atreladas à company, não ao usuário diretamente
   * IMPORTANTE: A query usa companyId, NÃO ownerId ou userId
   * Inclui mídias deletadas (exclusão lógica)
   */
  const fetchMidias = async () => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    // Aguarda o carregamento do userRole antes de buscar mídias
    if (roleLoading) {
      return; // Ainda carregando, aguarda
    }

    if (!userRole?.companyId) {
      setError('Usuário não está atrelado a uma company');
      setMidias([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Busca todas as mídias da company do owner, incluindo deletadas
      // IMPORTANTE: Usa companyId para filtrar, NÃO ownerId ou userId
      // Nota: Para incluir deletadas, não filtramos por deleted
      // O owner precisa ver todas as mídias da company, mesmo as deletadas
      const q = query(
        collection(db, 'media'),
        where('companyId', '==', userRole.companyId), // FILTRO POR COMPANY ID, NÃO USER ID
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const midiasData: Media[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Validação extra: garante que a mídia tem companyId e corresponde ao companyId do usuário
        // Isso previne problemas caso haja mídias sem companyId ou com companyId incorreto
        if (data.companyId === userRole.companyId) {
          midiasData.push({
            id: docSnap.id,
            ...data,
          } as Media);
        } else {
          // Log de warning se encontrar mídia com companyId diferente (não deveria acontecer)
          console.warn(`Mídia ${docSnap.id} tem companyId diferente do esperado. Esperado: ${userRole.companyId}, Encontrado: ${data.companyId}`);
        }
      });

      setMidias(midiasData);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao buscar mídias');
      console.error('Error fetching owner midias:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cria uma nova mídia
   * @param mediaData Dados da mídia (sem id, createdAt, etc)
   */
  const createMedia = async (mediaData: Omit<Media, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      // Verifica se o usuário tem companyId
      // As mídias são atreladas à company, não ao usuário diretamente
      if (!userRole?.companyId) {
        throw new Error('Usuário não está atrelado a uma company');
      }

      // Adiciona dados do owner e timestamps
      // ownerId é mantido para histórico (quem criou), mas a mídia pertence à company
      // IMPORTANTE: companyId é sempre definido baseado no userRole, garantindo que a mídia
      // seja sempre filtrada corretamente pela company do owner
      const newMedia = {
        ...mediaData,
        companyId: userRole.companyId, // Garante que companyId sempre seja definido
        ownerId: user.uid, // Mantido para histórico de quem criou
        deleted: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Remove campos undefined (Firestore não aceita undefined)
      const cleanMedia = removeUndefinedFields(newMedia as Record<string, unknown>);

      const docRef = await addDoc(collection(db, 'media'), cleanMedia);

      // Atualiza o role do usuário para 'owner' se ainda não for
      // Verifica se o usuário já é owner antes de atualizar
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        // Se o usuário ainda é 'client', atualiza para 'owner'
        if (userData.role === 'client') {
          await updateDoc(userRef, {
            role: 'owner',
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        // Se o documento do usuário não existe, cria com role 'owner'
        await setDoc(userRef, {
          email: user.email || '',
          role: 'owner',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Atualiza a lista local
      await fetchMidias();

      return docRef.id;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao criar mídia');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza uma mídia existente
   * Não permite alterar o preço (price)
   * @param mediaId ID da mídia
   * @param updates Campos a serem atualizados (sem price)
   */
  const updateMedia = async (
    mediaId: string,
    updates: Partial<Omit<Media, 'id' | 'price' | 'createdAt' | 'ownerId'>>
  ) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Verifica se o usuário tem companyId antes de continuar
    if (!userRole?.companyId) {
      throw new Error('Usuário não está atrelado a uma company');
    }

    try {
      setLoading(true);
      setError(null);

      // Verifica se a mídia pertence à company do owner
      const mediaRef = doc(db, 'media', mediaId);
      const mediaSnap = await getDoc(mediaRef);

      if (!mediaSnap.exists()) {
        throw new Error('Mídia não encontrada');
      }

      const mediaData = mediaSnap.data() as Media;
      
      // Verifica se a mídia pertence à company do usuário
      // IMPORTANTE: Verifica usando companyId, NÃO ownerId
      if (!mediaData.companyId) {
        throw new Error('Mídia não possui companyId associado');
      }

      if (mediaData.companyId !== userRole.companyId) {
        throw new Error('Você não tem permissão para editar esta mídia');
      }

      // Remove campos que não podem ser alterados:
      // - price: não pode ser alterado
      // - companyId: não pode ser alterado (a mídia pertence à company)
      // - ownerId: não pode ser alterado (histórico de quem criou)
      const safeUpdates = { ...updates };
      // Remove campos protegidos se existirem
      delete (safeUpdates as Record<string, unknown>).price;
      delete (safeUpdates as Record<string, unknown>).companyId;
      delete (safeUpdates as Record<string, unknown>).ownerId;
      
      // Remove campos undefined (Firestore não aceita undefined)
      const cleanUpdates = removeUndefinedFields(safeUpdates);
      
      // Adiciona timestamp de atualização
      await updateDoc(mediaRef, {
        ...cleanUpdates,
        updatedAt: Timestamp.now(),
      });

      // Atualiza a lista local
      await fetchMidias();

      return true;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao atualizar mídia');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deleta uma mídia (exclusão lógica)
   * Marca o campo deleted como true, mas não remove do banco
   * @param mediaId ID da mídia
   */
  const deleteMedia = async (mediaId: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Verifica se o usuário tem companyId antes de continuar
    if (!userRole?.companyId) {
      throw new Error('Usuário não está atrelado a uma company');
    }

    try {
      setLoading(true);
      setError(null);

      // Verifica se a mídia pertence à company do owner
      const mediaRef = doc(db, 'media', mediaId);
      const mediaSnap = await getDoc(mediaRef);

      if (!mediaSnap.exists()) {
        throw new Error('Mídia não encontrada');
      }

      const mediaData = mediaSnap.data() as Media;
      
      // Verifica se a mídia pertence à company do usuário
      // IMPORTANTE: Verifica usando companyId, NÃO ownerId
      if (!mediaData.companyId) {
        throw new Error('Mídia não possui companyId associado');
      }

      if (mediaData.companyId !== userRole.companyId) {
        throw new Error('Você não tem permissão para deletar esta mídia');
      }

      // Exclusão lógica - marca como deletada
      await updateDoc(mediaRef, {
        deleted: true,
        updatedAt: Timestamp.now(),
      });

      // Atualiza a lista local
      await fetchMidias();

      return true;
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao deletar mídia');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Busca mídias quando o componente monta ou o usuário/company muda
  // IMPORTANTE: Aguarda o carregamento do userRole antes de buscar mídias
  useEffect(() => {
    // Se ainda está carregando o role, aguarda
    if (roleLoading) {
      return;
    }

    // Só busca mídias se o usuário estiver autenticado E tiver companyId
    if (user && userRole?.companyId) {
      fetchMidias();
    } else {
      setMidias([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userRole?.companyId, roleLoading]);

  return {
    midias,
    loading,
    error,
    fetchMidias,
    createMedia,
    updateMedia,
    deleteMedia,
  };
}

