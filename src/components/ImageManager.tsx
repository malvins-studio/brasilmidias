'use client';

/**
 * Componente para gerenciar imagens de mídia
 * 
 * Permite:
 * - Adicionar imagens via URL (com validação)
 * - Fazer upload de imagens para Firebase Storage
 * - Remover imagens
 * - Visualizar preview das imagens
 * 
 * Limites:
 * - Tamanho máximo: 5MB por imagem
 * - Formatos aceitos: jpg, jpeg, png, webp
 */

import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X, Link as LinkIcon, Upload, Image as ImageIcon } from 'lucide-react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ImageManagerProps {
  images: string[]; // Array de URLs de imagens
  onChange: (images: string[]) => void; // Callback quando as imagens mudam
  maxImages?: number; // Número máximo de imagens (padrão: 10)
  maxSizeMB?: number; // Tamanho máximo por imagem em MB (padrão: 5)
  required?: boolean; // Se pelo menos uma imagem é obrigatória
}

/**
 * Valida se uma string é uma URL válida
 */
function isValidURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida o tipo de arquivo de imagem
 */
function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

export function ImageManager({
  images,
  onChange,
  maxImages = 10,
  maxSizeMB = 5,
  required = false,
}: ImageManagerProps) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  // Rastreia quais imagens falharam ao carregar (por índice)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState<string | null>(null); // Nome do arquivo sendo enviado
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Adiciona uma imagem via URL
   */
  const handleAddUrl = () => {
    const trimmedUrl = urlInput.trim();

    if (!trimmedUrl) {
      setUrlError('URL não pode estar vazia');
      return;
    }

    if (!isValidURL(trimmedUrl)) {
      setUrlError('URL inválida. Use http:// ou https://');
      return;
    }

    if (images.length >= maxImages) {
      setUrlError(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    if (images.includes(trimmedUrl)) {
      setUrlError('Esta imagem já foi adicionada');
      return;
    }

    // Adiciona a URL ao array de imagens
    onChange([...images, trimmedUrl]);
    setUrlInput('');
    setUrlError(null);
    // Não precisa limpar failedImages aqui, pois o novo índice será diferente
  };

  /**
   * Remove uma imagem do array
   */
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
    // Remove o índice do conjunto de imagens que falharam
    setFailedImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      // Ajusta os índices das imagens que vêm depois da removida
      const adjustedSet = new Set<number>();
      newSet.forEach((failedIndex) => {
        if (failedIndex > index) {
          adjustedSet.add(failedIndex - 1);
        } else {
          adjustedSet.add(failedIndex);
        }
      });
      return adjustedSet;
    });
  };

  /**
   * Marca uma imagem como falhada ao carregar
   */
  const handleImageError = (index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
  };

  /**
   * Faz upload de uma imagem para o Firebase Storage
   */
  const handleFileUpload = async (file: File) => {
    // Valida tipo de arquivo
    if (!isValidImageType(file)) {
      setUrlError('Formato inválido. Use JPG, PNG ou WEBP');
      return;
    }

    // Valida tamanho (converte MB para bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUrlError(`Imagem muito grande. Tamanho máximo: ${maxSizeMB}MB`);
      return;
    }

    if (images.length >= maxImages) {
      setUrlError(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    try {
      setUploading(file.name);
      setUrlError(null);

      // Cria uma referência única para o arquivo no Storage
      // Usa timestamp + nome do arquivo para evitar conflitos
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(storage, `media-images/${fileName}`);

      // Faz upload do arquivo
      await uploadBytes(storageRef, file);

      // Obtém a URL de download
      const downloadURL = await getDownloadURL(storageRef);

      // Adiciona a URL ao array de imagens
      onChange([...images, downloadURL]);
      setUrlInput('');
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro ao fazer upload da imagem';
      setUrlError(errorMessage);
    } finally {
      setUploading(null);
      // Limpa o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handler para quando um arquivo é selecionado
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Handler para drag and drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <Label>
        Imagens {required && '*'}
        <span className="text-sm text-muted-foreground ml-2">
          ({images.length}/{maxImages})
        </span>
      </Label>

      {/* Input para URL */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://exemplo.com/imagem.jpg"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              className={urlError ? 'border-red-500' : ''}
            />
            {urlError && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
            variant="outline"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Adicionar URL
          </Button>
        </div>
      </div>

      {/* Upload de arquivo */}
      <div className="space-y-2">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            uploading || images.length >= maxImages
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-primary/50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
            disabled={uploading !== null || images.length >= maxImages}
          />
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center gap-2 ${
              uploading || images.length >= maxImages ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Clique para fazer upload ou arraste uma imagem aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos: JPG, PNG, WEBP • Tamanho máximo: {maxSizeMB}MB
              </p>
            </div>
          </label>
        </div>
        {uploading && (
          <p className="text-sm text-blue-600 flex items-center gap-1">
            <ImageIcon className="h-4 w-4 animate-pulse" />
            Enviando {uploading}...
          </p>
        )}
      </div>

      {/* Lista de imagens adicionadas */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label>Imagens adicionadas ({images.length})</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => {
              const imageFailed = failedImages.has(index);
              
              return (
                <Card key={index} className="relative group">
                  <CardContent className="p-2">
                    <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                      {imageFailed ? (
                        // Placeholder quando a imagem falha ao carregar
                        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground bg-red-50 border-2 border-red-200 border-dashed">
                          <AlertCircle className="h-6 w-6 text-red-400 mb-1" />
                          <span className="text-center px-2">Erro ao carregar</span>
                        </div>
                      ) : (
                        // Imagem normal
                        <img
                          src={imageUrl}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(index)}
                        />
                      )}
                      {/* Botão de deletar - sempre visível, especialmente quando há erro */}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className={`absolute top-1 right-1 transition-opacity ${
                          imageFailed 
                            ? 'opacity-100' 
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={() => handleRemoveImage(index)}
                        title="Remover imagem"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={imageUrl}>
                      {imageUrl.length > 30 ? `${imageUrl.substring(0, 30)}...` : imageUrl}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagem se não houver imagens e for obrigatório */}
      {required && images.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Pelo menos uma imagem é obrigatória
        </p>
      )}

      {/* Mensagem de sucesso quando houver imagens */}
      {images.length > 0 && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          {images.length} {images.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'}
        </p>
      )}
    </div>
  );
}

