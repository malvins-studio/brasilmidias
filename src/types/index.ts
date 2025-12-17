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
  pricePerDay: number;
  images: string[];
  coordinates: Coordinates;
  address: Address;
  companyId: string;
  companyName: string;
  createdAt: Timestamp;
}

export interface Reservation {
  id: string;
  mediaId: string;
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Timestamp;
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
  logo: string;
}

