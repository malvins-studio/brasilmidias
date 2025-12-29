'use client';

/**
 * Página de Cadastro de Nova Mídia
 * 
 * Permite ao owner cadastrar uma nova mídia com todos os dados necessários:
 * - Informações básicas (nome, tipo, cidade, estado)
 * - Endereço completo
 * - Coordenadas (lat/lng) para o mapa
 * - Preço por dia
 * - Tráfego
 * - Imagens (URLs)
 * - Stripe Connect Account ID (opcional)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOwnerMidias } from '@/hooks/useOwnerMidias';
import { Address, Coordinates } from '@/types';
import { ImageManager } from '@/components/ImageManager';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

// Importa dinamicamente para evitar problemas de SSR
const CoordinatePicker = dynamic(
  () => import('@/components/CoordinatePicker'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-lg border bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    ),
  }
);

export default function NewMediaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { userRole } = useUserRole(); // Para pegar o companyId do usuário
  const { createMedia, loading } = useOwnerMidias();

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    mediaType: '',
    city: '',
    state: '',
    price: '',
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
    // Imagens (array de URLs)
    images: [] as string[],
    // Company (pode ser o nome da empresa do owner)
    companyName: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handler para mudanças nos campos do formulário
   * Aceita string ou array de strings (para imagens)
   */
  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpa erros quando o usuário começa a digitar
    if (error) setError(null);
  };

  /**
   * Valida os dados do formulário antes de enviar
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
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Preço é obrigatório e deve ser maior que zero');
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
      setError('Coordenadas (latitude e longitude) são obrigatórias');
      return false;
    }
    if (isNaN(parseFloat(formData.lat)) || isNaN(parseFloat(formData.lng))) {
      setError('Coordenadas devem ser números válidos');
      return false;
    }
    if (formData.images.length === 0) {
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

    if (!user) {
      setError('Você precisa estar logado para cadastrar uma mídia');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setError(null);
      setSuccess(false);

      // As imagens já estão em formato de array
      const imagesArray = formData.images;

      // Monta o objeto de endereço
      // Se complement estiver vazio, não inclui o campo (evita undefined no Firestore)
      const address: Address = {
        street: formData.street.trim(),
        number: formData.number.trim(),
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        ...(formData.complement.trim() ? { complement: formData.complement.trim() } : {}),
      };

      // Monta as coordenadas
      const coordinates: Coordinates = {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      };

      // Verifica se o usuário tem companyId
      // As mídias são atreladas à company, não ao usuário diretamente
      if (!userRole?.companyId) {
        setError('Você precisa estar atrelado a uma company para cadastrar mídias. Entre em contato com o administrador.');
        return;
      }

      // Busca informações da company para pegar o nome
      const companyDoc = await getDoc(doc(db, 'companies', userRole.companyId));
      
      if (!companyDoc.exists()) {
        setError('Company não encontrada. Entre em contato com o administrador.');
        return;
      }

      const companyData = companyDoc.data();

      // Cria a mídia
      // IMPORTANTE: A mídia é atrelada à company, não ao usuário owner
      const mediaData = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        mediaType: formData.mediaType.trim(),
        traffic: parseInt(formData.traffic) || 0,
        trafficUnit: formData.trafficUnit,
        price: parseFloat(formData.price),
        priceType: 'biweek' as const, // Sempre bi-semanal para o owner
        images: imagesArray,
        coordinates,
        address,
        companyId: userRole.companyId, // Usa o companyId do usuário
        companyName: companyData.name || formData.companyName.trim() || formData.name.trim(),
        ownerId: user?.uid || '', // ID do usuário owner da mídia
      };

      await createMedia(mediaData);

      setSuccess(true);
    } catch (err) {
      const error = err as { message?: string };
      setError(error.message || 'Erro ao cadastrar mídia');
    }
  };

  // Mostra loading enquanto autenticação está carregando
  // Isso evita redirecionamento prematuro durante o refresh da página
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          Carregando...
        </div>
      </div>
    );
  }

  // Só redireciona se o carregamento estiver completo e o usuário não estiver autenticado
  if (!user) {
    router.push('/login');
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
          <h1 className="text-3xl font-bold mb-2">Cadastrar Nova Mídia</h1>
          <p className="text-muted-foreground">
            Preencha os dados abaixo para cadastrar sua mídia
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
                      placeholder="Ex: Outdoor Avenida Paulista"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mediaType">Tipo de Mídia *</Label>
                    <Input
                      id="mediaType"
                      value={formData.mediaType}
                      onChange={(e) => handleChange('mediaType', e.target.value)}
                      placeholder="Ex: Outdoor, Busdoor, Painel"
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
                      placeholder="São Paulo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="SP"
                      maxLength={2}
                      required
                    />
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
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="trafficUnit">Unidade de Tráfego</Label>
                    <Input
                      id="trafficUnit"
                      value={formData.trafficUnit}
                      onChange={(e) => handleChange('trafficUnit', e.target.value)}
                      placeholder="pessoas/dia"
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
                      placeholder="Avenida Paulista"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => handleChange('number', e.target.value)}
                      placeholder="1000"
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
                      placeholder="Bela Vista"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleChange('zipCode', e.target.value)}
                      placeholder="01310-100"
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
                    placeholder="Apto 101"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coordenadas */}
            <Card>
              <CardHeader>
                <CardTitle>Localização no Mapa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Clique no mapa para selecionar a localização</Label>
                  <CoordinatePicker
                    lat={formData.lat ? parseFloat(formData.lat) : null}
                    lng={formData.lng ? parseFloat(formData.lng) : null}
                    onCoordinateChange={(lat, lng) => {
                      handleChange('lat', lat.toString());
                      handleChange('lng', lng.toString());
                    }}
                    height="400px"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">Latitude *</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      value={formData.lat}
                      onChange={(e) => handleChange('lat', e.target.value)}
                      placeholder="-23.5505"
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
                      placeholder="-46.6333"
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você pode clicar no mapa acima ou digitar as coordenadas manualmente
                </p>
              </CardContent>
            </Card>

            {/* Imagens */}
            <Card>
              <CardHeader>
                <CardTitle>Imagens</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageManager
                  images={formData.images}
                  onChange={(images) => handleChange('images', images)}
                  maxImages={10}
                  maxSizeMB={5}
                  required
                />
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
                    placeholder="Nome da sua empresa"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mensagens de Erro e Sucesso */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  Mídia cadastrada com sucesso! Redirecionando...
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
                {loading ? 'Salvando...' : 'Salvar Mídia'}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

