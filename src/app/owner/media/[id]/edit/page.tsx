'use client';

/**
 * Página de Edição de Mídia
 * 
 * Permite ao owner editar uma mídia existente.
 * IMPORTANTE: O preço (pricePerDay) NÃO pode ser alterado após a criação.
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerMidias } from '@/hooks/useOwnerMidias';
import { Media, Address, Coordinates } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditMediaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { updateMedia, loading } = useOwnerMidias();

  const mediaId = params.id as string;

  // Estados do formulário
  const [media, setMedia] = useState<Media | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    mediaType: '',
    city: '',
    state: '',
    pricePerDay: '', // Não editável, apenas exibição
    traffic: '',
    trafficUnit: 'pessoas/dia',
    // Endereço
    street: '',
    number: '',
    neighborhood: '',
    zipCode: '',
    complement: '',
    // Coordenadas
    lat: '',
    lng: '',
    // Imagens
    images: '',
    // Stripe Connect Account ID
    ownerStripeAccountId: '',
    // Company
    companyName: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Carrega os dados da mídia ao montar o componente
   */
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchMedia = async () => {
      try {
        setLoadingMedia(true);
        const mediaDoc = await getDoc(doc(db, 'media', mediaId));

        if (!mediaDoc.exists()) {
          setError('Mídia não encontrada');
          return;
        }

        const mediaData = {
          id: mediaDoc.id,
          ...mediaDoc.data(),
        } as Media;

        // Verifica se o usuário é o owner
        if (mediaData.ownerId !== user.uid) {
          setError('Você não tem permissão para editar esta mídia');
          return;
        }

        setMedia(mediaData);

        // Preenche o formulário com os dados da mídia
        setFormData({
          name: mediaData.name || '',
          mediaType: mediaData.mediaType || '',
          city: mediaData.city || '',
          state: mediaData.state || '',
          pricePerDay: mediaData.pricePerDay?.toString() || '',
          traffic: mediaData.traffic?.toString() || '',
          trafficUnit: mediaData.trafficUnit || 'pessoas/dia',
          street: mediaData.address?.street || '',
          number: mediaData.address?.number || '',
          neighborhood: mediaData.address?.neighborhood || '',
          zipCode: mediaData.address?.zipCode || '',
          complement: mediaData.address?.complement || '',
          lat: mediaData.coordinates?.lat?.toString() || '',
          lng: mediaData.coordinates?.lng?.toString() || '',
          images: mediaData.images?.join(', ') || '',
          ownerStripeAccountId: mediaData.ownerStripeAccountId || '',
          companyName: mediaData.companyName || '',
        });
      } catch (err) {
        const error = err as { message?: string };
        setError(error.message || 'Erro ao carregar mídia');
      } finally {
        setLoadingMedia(false);
      }
    };

    fetchMedia();
  }, [user, mediaId, router]);

  /**
   * Handler para mudanças nos campos do formulário
   */
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) setError(null);
  };

  /**
   * Valida os dados do formulário
   */
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Nome da mídia é obrigatório');
      return false;
    }
    if (!formData.mediaType.trim()) {
      setError('Tipo de mídia é obrigatório');
      return false;
    }
    if (!formData.city.trim()) {
      setError('Cidade é obrigatória');
      return false;
    }
    if (!formData.state.trim()) {
      setError('Estado é obrigatório');
      return false;
    }
    if (!formData.street.trim()) {
      setError('Rua é obrigatória');
      return false;
    }
    if (!formData.number.trim()) {
      setError('Número é obrigatório');
      return false;
    }
    if (!formData.neighborhood.trim()) {
      setError('Bairro é obrigatório');
      return false;
    }
    if (!formData.zipCode.trim()) {
      setError('CEP é obrigatório');
      return false;
    }
    if (!formData.lat || !formData.lng) {
      setError('Coordenadas são obrigatórias');
      return false;
    }
    if (isNaN(parseFloat(formData.lat)) || isNaN(parseFloat(formData.lng))) {
      setError('Coordenadas devem ser números válidos');
      return false;
    }
    if (!formData.images.trim()) {
      setError('Pelo menos uma imagem é obrigatória');
      return false;
    }

    return true;
  };

  /**
   * Handler para submeter o formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !media) {
      setError('Dados inválidos');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setError(null);
      setSuccess(false);

      // Processa imagens
      const imagesArray = formData.images
        .split(',')
        .map((img) => img.trim())
        .filter((img) => img.length > 0);

      // Monta o objeto de endereço
      const address: Address = {
        street: formData.street.trim(),
        number: formData.number.trim(),
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        complement: formData.complement.trim() || undefined,
      };

      // Monta as coordenadas
      const coordinates: Coordinates = {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      };

      // Atualiza a mídia (sem alterar pricePerDay, ownerId, createdAt)
      await updateMedia(mediaId, {
        name: formData.name.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        mediaType: formData.mediaType.trim(),
        traffic: parseInt(formData.traffic) || 0,
        trafficUnit: formData.trafficUnit,
        images: imagesArray,
        coordinates,
        address,
        companyName: formData.companyName.trim() || formData.name.trim(),
        ownerStripeAccountId: formData.ownerStripeAccountId.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/owner/dashboard');
      }, 2000);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao atualizar mídia');
    }
  };

  if (authLoading || loadingMedia) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error && !media) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/owner/dashboard">
              <Button>Voltar</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!media) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/owner/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Editar Mídia</h1>
          <p className="text-muted-foreground">
            Edite os dados da sua mídia (o preço não pode ser alterado)
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Mídia *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mediaType">Tipo de Mídia *</Label>
                    <Input
                      id="mediaType"
                      value={formData.mediaType}
                      onChange={(e) => handleChange('mediaType', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricePerDay">Preço por Dia (R$)</Label>
                    <Input
                      id="pricePerDay"
                      value={formData.pricePerDay}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O preço não pode ser alterado após a criação
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="traffic">Tráfego</Label>
                    <Input
                      id="traffic"
                      type="number"
                      value={formData.traffic}
                      onChange={(e) => handleChange('traffic', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trafficUnit">Unidade de Tráfego</Label>
                    <Input
                      id="trafficUnit"
                      value={formData.trafficUnit}
                      onChange={(e) => handleChange('trafficUnit', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Rua *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleChange('street', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => handleChange('number', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleChange('neighborhood', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => handleChange('complement', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coordenadas */}
            <Card>
              <CardHeader>
                <CardTitle>Coordenadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">Latitude *</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => handleChange('lat', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Longitude *</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="any"
                      value={formData.lng}
                      onChange={(e) => handleChange('lng', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Imagens */}
            <Card>
              <CardHeader>
                <CardTitle>Imagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="images">URLs das Imagens *</Label>
                  <Textarea
                    id="images"
                    value={formData.images}
                    onChange={(e) => handleChange('images', e.target.value)}
                    rows={4}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separe múltiplas URLs por vírgula
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Configurações Opcionais */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações Opcionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ownerStripeAccountId">Stripe Connect Account ID</Label>
                  <Input
                    id="ownerStripeAccountId"
                    value={formData.ownerStripeAccountId}
                    onChange={(e) => handleChange('ownerStripeAccountId', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mensagens */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  Mídia atualizada com sucesso! Redirecionando...
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4 justify-end">
              <Link href="/owner/dashboard">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

