'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { MediaCard } from '@/components/MediaCard';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritos } from '@/hooks/useFavoritos';
import { Media } from '@/types';
import { Loader2 } from 'lucide-react';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { favoritos, loading: favoritosLoading } = useFavoritos();
  const router = useRouter();
  const [medias, setMedias] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchFavoriteMedias = async () => {
      if (!user || favoritos.length === 0) {
        setMedias([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const mediasData: Media[] = [];

        for (const mediaId of favoritos) {
          try {
            const mediaDoc = await getDoc(doc(db, 'media', mediaId));
            if (mediaDoc.exists()) {
              const mediaData = mediaDoc.data();
              // Verifica se a mídia não foi deletada
              if (!mediaData.deleted) {
                mediasData.push({
                  id: mediaDoc.id,
                  ...mediaData,
                } as Media);
              }
            }
          } catch (error) {
            console.error(`Error fetching media ${mediaId}:`, error);
          }
        }

        // Ordena por data de criação (mais recentes primeiro)
        mediasData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setMedias(mediasData);
      } catch (error) {
        console.error('Error fetching favorite medias:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!favoritosLoading) {
      fetchFavoriteMedias();
    }
  }, [user, favoritos, favoritosLoading, authLoading, router]);

  if (authLoading || favoritosLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meus Favoritos</h1>
          <p className="text-muted-foreground">
            {medias.length === 0 
              ? 'Você ainda não tem mídias favoritas'
              : `${medias.length} ${medias.length === 1 ? 'mídia favoritada' : 'mídias favoritadas'}`
            }
          </p>
        </div>

        {medias.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não tem mídias favoritas
              </p>
              <p className="text-sm text-muted-foreground">
                Clique no ícone de coração nas mídias para adicioná-las aos favoritos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medias.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                isReserved={false}
                cardId={`favorite-${media.id}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

