import { Timestamp } from 'firebase/firestore';

export interface Address {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Media {
  id: string;
  name: string;
  city: string;
  state: string;
  mediaType: string;
  traffic: number;
  trafficUnit: string;
  // Preços por período
  price: number; // Preço base (obrigatório) - a unidade é definida por priceType
  pricePerWeek?: number; // Preço por semana (opcional)
  pricePerBiweek?: number; // Preço por bi-semana (opcional)
  pricePerMonth?: number; // Preço por mês (opcional)
  priceType: 'day' | 'week' | 'biweek' | 'month'; // Tipo de preço padrão para exibição e cálculo
  images: string[];
  coordinates: Coordinates;
  address: Address;
  companyId: string;
  companyName: string;
  ownerId: string; // ID do usuário owner da mídia
  deleted?: boolean; // Exclusão lógica - se true, a mídia não aparece nas buscas
  createdAt: Timestamp;
  updatedAt?: Timestamp; // Data da última atualização
}

export interface Reservation {
  id: string;
  mediaId: string;
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Timestamp;
  // Informações de pagamento
  paymentIntentId?: string;
  paymentStatus?: 'pending' | 'paid' | 'held' | 'released' | 'refunded';
  platformFee?: number; // Taxa da plataforma
  ownerAmount?: number; // Valor que será pago ao owner
  paymentReleasedAt?: Timestamp; // Data em que o pagamento foi liberado
}

export interface Favorite {
  id: string;
  userId: string;
  mediaId: string;
  createdAt: Timestamp;
}

export interface Company {
  id: string;
  name: string;
  logo?: string; // Logo da empresa (opcional)
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface User {
  id: string; // Mesmo ID do Firebase Auth (userId)
  email: string;
  name?: string;
  role: 'client' | 'owner'; // Tipo de usuário: cliente ou owner
  companyId?: string; // ID da company à qual o usuário está atrelado (apenas SUPER ADMIN pode definir)
  isSuperAdmin?: boolean; // Se true, é super admin da plataforma (pode gerenciar companies e usuários)
  cpf?: string; // CPF do cliente (apenas números)
  cnpj?: string; // CNPJ do cliente (apenas números)
  documentType?: 'cpf' | 'cnpj'; // Tipo de documento (CPF ou CNPJ)
  phone?: string; // Telefone do cliente (apenas números, formato: (00) 00000-0000)
  stripeAccountId?: string; // ID da conta Stripe Connect do owner
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

