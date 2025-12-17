"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Media } from "@/types";
import { useFavoritos } from "@/hooks/useFavoritos";
import { useAuth } from "@/hooks/useAuth";

interface MediaCardProps {
  media: Media;
  isReserved?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  cardId?: string;
}

export function MediaCard({ media, isReserved, onMouseEnter, onMouseLeave, cardId }: MediaCardProps) {
  const { isFavorito, toggleFavorito } = useFavoritos();
  const { user } = useAuth();
  const favorited = isFavorito(media.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      toggleFavorito(media.id);
    }
  };

  return (
    <div 
      id={cardId}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link href={`/midia/${media.id}`} className="block">
        <Card className="overflow-hidden hover:shadow-lg pt-0 pb-6 gap-4 transition-shadow cursor-pointer">
        <div className="relative aspect-video">
          <Image
            src={media.images[0] || "/placeholder.svg"}
            alt={media.name}
            fill
            className="object-cover"
          />
          {isReserved && (
            <Badge className="absolute top-2 left-2" variant="destructive">
              Reservado
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-white/80 hover:bg-white"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`h-4 w-4 ${
                favorited ? "fill-red-500 text-red-500" : "text-gray-600"
              }`}
            />
          </Button>
        </div>
        <CardContent className="p-2 pt-0">
          <h3 className="font-semibold text-lg mb-1 truncate mt-0">{media.name}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {media.city}, {media.state}
          </p>
          <div className="flex flex-col">
            <span className="text-sm font-medium mb-1">{media.mediaType}</span>
            <small className="text-xs text-muted-foreground">
              {media.companyName}
            </small>
          </div>
        </CardContent>
        </Card>
      </Link>
    </div>
  );
}
