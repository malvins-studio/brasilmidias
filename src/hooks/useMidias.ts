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
      let q = query(collection(db, 'media'));

      if (cityFilter && cityFilter.trim()) {
        q = query(q, where('city', '==', cityFilter.trim()));
      }

      const querySnapshot = await getDocs(q);
      const midiasData: Media[] = [];

      querySnapshot.forEach((doc) => {
        midiasData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || Timestamp.now(),
        } as Media);
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

