'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const validImages = images.map((image, index) => ({ image, index }));

  const openGallery = (index: number) => {
    // Encontra o índice real na lista de imagens válidas
    const realIndex = validImages.findIndex((img) => img.index === index);
    if (realIndex !== -1) {
      setSelectedIndex(realIndex);
    }
  };

  const navigateGallery = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : validImages.length - 1);
    } else {
      setSelectedIndex(selectedIndex < validImages.length - 1 ? selectedIndex + 1 : 0);
    }
  };

  // Navegação por teclado
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (selectedIndex !== null) {
          setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : validImages.length - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedIndex !== null) {
          setSelectedIndex(selectedIndex < validImages.length - 1 ? selectedIndex + 1 : 0);
        }
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, validImages.length]);

  if (validImages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma imagem disponível</p>
      </div>
    );
  }

  // Limita a 3 imagens para o grid
  const displayImages = validImages.slice(0, 3);
  const mainImage = displayImages[0];
  const sideImages = displayImages.slice(1, 3);

  const currentImage = selectedIndex !== null ? validImages[selectedIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 h-[400px]">
        {/* Imagem principal (maior) */}
        <div 
          className="col-span-2 row-span-2 relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity h-full"
          onClick={() => openGallery(mainImage.index)}
        >
          <Image
            src={mainImage.image || '/placeholder.svg'}
            alt={`${alt} - Imagem principal`}
            fill
            className="object-cover"
          />
        </div>

        {/* Container para as duas imagens menores */}
        <div className="col-span-1 row-span-2  flex flex-col gap-2 h-full">
          {sideImages.map(({ image, index }) => (
            <div
              key={index}
              className="relative flex-1 rounded-lg overflow-hidden h-1/2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openGallery(index)}
            >
              <Image
                src={image || '/placeholder.svg'}
                alt={`${alt} - Imagem ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}

          {/* Se tiver mais de 3 imagens, mostra um indicador */}
          {validImages.length > 3 && (
            <div
              className="relative flex-1 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-black/50 flex items-center justify-center"
              onClick={() => openGallery(displayImages[2]?.index || 0)}
            >
              <div className="text-white text-center">
                <p className="text-2xl font-bold">+{validImages.length - 3}</p>
                <p className="text-sm">mais fotos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal da Galeria */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95 border-none">
          {currentImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Botão fechar */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Botão anterior */}
              {validImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 text-white hover:bg-white/30 bg-black/30 h-12 w-12 rounded-full"
                  onClick={() => navigateGallery('prev')}
                >
                  <ChevronLeft className="h-10 w-10" />
                </Button>
              )}

              {/* Imagem */}
              <div 
                className="relative w-full h-full flex items-center justify-center p-8 cursor-pointer"
                onClick={(e) => {
                  // Se clicar na imagem, não fecha o modal
                  e.stopPropagation();
                }}
              >
                <Image
                  src={currentImage.image || '/placeholder.svg'}
                  alt={`${alt} - Imagem ${currentImage.index + 1}`}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-full object-contain"
                  priority
                />
              </div>

              {/* Botão próximo */}
              {validImages.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 text-white hover:bg-white/30 bg-black/30 h-12 w-12 rounded-full"
                  onClick={() => navigateGallery('next')}
                >
                  <ChevronRight className="h-10 w-10" />
                </Button>
              )}

              {/* Indicador de posição */}
              {validImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 text-white text-sm">
                  {selectedIndex !== null && selectedIndex + 1} / {validImages.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

