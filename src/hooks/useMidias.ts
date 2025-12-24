import { useState, useCallback } from 'react';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Media } from '@/types';

export function useMidias() {
  const [midias, setMidias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMidias = useCallback(async (cityFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Inicia a query
      // Nota: Firestore não permite múltiplos where com !=
      // Vamos filtrar mídias deletadas depois da query
      let q = query(collection(db, 'media'));

      // Adiciona filtro de cidade se fornecido
      if (cityFilter && cityFilter.trim()) {
        q = query(q, where('city', '==', cityFilter.trim()));
      }

      const querySnapshot = await getDocs(q);
      const midiasData: Media[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filtra mídias deletadas logicamente (exclusão lógica)
        // Inclui mídias onde deleted é undefined, false ou não existe
        if (!data.deleted) {
          midiasData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt || Timestamp.now(),
          } as Media);
        }
      });

      setMidias(midiasData);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao buscar mídias');
      console.error('Error fetching midias:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { midias, loading, error, fetchMidias };
}

