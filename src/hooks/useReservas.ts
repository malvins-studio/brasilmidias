import { useState } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  where, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { Reservation } from '@/types';

export function useReservas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const checkAvailability = async (
    mediaId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> => {
    try {

      // Verifica se há reservas confirmadas que conflitam com o período
      const q = query(
        collection(db, 'reservations'),
        where('mediaId', '==', mediaId),
        where('status', '==', 'confirmed')
      );

      const querySnapshot = await getDocs(q);
      
      for (const doc of querySnapshot.docs) {
        const reservation = doc.data() as Reservation;
        const resStart = reservation.startDate.toDate();
        const resEnd = reservation.endDate.toDate();

        // Verifica se há sobreposição de datas
        if (
          (startDate >= resStart && startDate <= resEnd) ||
          (endDate >= resStart && endDate <= resEnd) ||
          (startDate <= resStart && endDate >= resEnd)
        ) {
          return false; // Não está disponível
        }
      }

      return true; // Está disponível
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  };

  const getReservationsForPeriod = async (
    mediaId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> => {
    try {

      const q = query(
        collection(db, 'reservations'),
        where('mediaId', '==', mediaId),
        where('status', '==', 'confirmed')
      );

      const querySnapshot = await getDocs(q);
      const reservations: Reservation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const resStart = data.startDate.toDate();
        const resEnd = data.endDate.toDate();

        // Verifica se a reserva se sobrepõe ao período
        if (
          (resStart >= startDate && resStart <= endDate) ||
          (resEnd >= startDate && resEnd <= endDate) ||
          (resStart <= startDate && resEnd >= endDate)
        ) {
          reservations.push({
            id: doc.id,
            ...data,
            startDate: data.startDate,
            endDate: data.endDate,
            createdAt: data.createdAt || Timestamp.now(),
          } as Reservation);
        }
      });

      return reservations;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return [];
    }
  };

  const createReservation = async (
    mediaId: string,
    startDate: Date,
    endDate: Date,
    totalPrice: number
  ): Promise<string | null> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      setLoading(true);

      // Verifica disponibilidade antes de criar
      const isAvailable = await checkAvailability(mediaId, startDate, endDate);
      if (!isAvailable) {
        throw new Error('Mídia não está disponível neste período');
      }

      const docRef = await addDoc(collection(db, 'reservations'), {
        mediaId,
        userId: user.uid,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        totalPrice,
        status: 'confirmed',
        createdAt: Timestamp.now(),
      });

      return docRef.id;
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    checkAvailability,
    getReservationsForPeriod,
    createReservation,
    loading,
  };
}

