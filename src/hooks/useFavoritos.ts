import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { Favorite } from '@/types';

export function useFavoritos() {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoritos([]);
      return;
    }

    const fetchFavoritos = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const favoritosIds: string[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          favoritosIds.push(data.mediaId);
        });

        setFavoritos(favoritosIds);
      } catch (error) {
        console.error('Error fetching favoritos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritos();
  }, [user]);

  const toggleFavorito = async (mediaId: string) => {
    if (!user) return;

    try {
      const isFavorito = favoritos.includes(mediaId);

      if (isFavorito) {
        // Remove favorito
        const q = query(
          collection(db, 'favorites'),
          where('userId', '==', user.uid),
          where('mediaId', '==', mediaId)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'favorites', docSnapshot.id));
        });
        setFavoritos(favoritos.filter((id) => id !== mediaId));
      } else {
        // Adiciona favorito
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          mediaId,
          createdAt: new Date(),
        });
        setFavoritos([...favoritos, mediaId]);
      }
    } catch (error) {
      console.error('Error toggling favorito:', error);
    }
  };

  const isFavorito = (mediaId: string) => {
    return favoritos.includes(mediaId);
  };

  return { favoritos, toggleFavorito, isFavorito, loading };
}

