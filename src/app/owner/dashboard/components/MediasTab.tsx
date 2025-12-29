'use client';

/**
 * Componente da aba de Mídias
 * 
 * Exibe todas as mídias do owner com:
 * - Opção de criar nova mídia
 * - Lista de mídias com ações de editar/deletar
 * - Indicação de mídias deletadas (soft delete)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Media } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface MediasTabProps {
  midias: Media[];
  loading: boolean;
  onDeleteMedia: (mediaId: string, mediaName: string) => void;
}

export function MediasTab({ midias, loading, onDeleteMedia }: MediasTabProps) {
  return (
    <div>
      {/* Botão de Nova Mídia */}
      <div className="mb-4 flex justify-end">
        <Link href="/owner/media/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Mídia
          </Button>
        </Link>
      </div>

      {/* Lista de Mídias */}
      {loading ? (
        <div className="text-center py-12">Carregando mídias...</div>
      ) : midias.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Você ainda não tem mídias cadastradas
            </p>
            <Link href="/owner/media/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeira Mídia
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {midias.map((media) => (
            <Card 
              key={media.id}
              className="transition-all duration-200 hover:shadow-lg hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{media.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {media.city}, {media.state}
                      </div>
                      <div>
                        <span className="font-medium">{formatCurrency(media.price)}</span>
                        <span className="text-muted-foreground"> / dia</span>
                      </div>
                      {media.deleted && (
                        <Badge variant="destructive">Deletada</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Link href={`/owner/media/${media.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteMedia(media.id, media.name)}
                    disabled={media.deleted}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {media.deleted ? 'Deletada' : 'Deletar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

