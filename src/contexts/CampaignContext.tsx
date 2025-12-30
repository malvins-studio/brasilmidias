'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { Campaign, CampaignMedia, Media } from '@/types';

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  campaignMedias: CampaignMedia[];
  loading: boolean;
  createCampaign: (name: string) => Promise<string>;
  addMediaToCampaign: (campaignId: string, mediaId: string, startDate: Date, endDate: Date, quantity: number, priceType: 'biweek' | 'month', totalPrice: number) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  setActiveCampaign: (campaign: Campaign | null) => void;
  getCampaignMedias: (campaignId: string) => CampaignMedia[];
  getCampaignTotalPrice: (campaignId: string) => number;
  refetch: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [campaignMedias, setCampaignMedias] = useState<CampaignMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!user?.uid) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'campaigns'),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const campaignsData: Campaign[] = [];

      querySnapshot.forEach((docSnap) => {
        campaignsData.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Campaign);
      });

      // Ordena por data de criação (mais recentes primeiro)
      campaignsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setCampaigns(campaignsData);

      // Se não há campanha ativa, define a primeira como ativa (se houver)
      if (!activeCampaign && campaignsData.length > 0) {
        const draftCampaign = campaignsData.find(c => c.status === 'draft' || c.status === 'pending_payment');
        if (draftCampaign) {
          setActiveCampaign(draftCampaign);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignMedias = async (campaignId: string) => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, 'campaignMedias'),
        where('campaignId', '==', campaignId),
        where('userId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const mediasData: CampaignMedia[] = [];

      querySnapshot.forEach((docSnap) => {
        mediasData.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as CampaignMedia);
      });

      setCampaignMedias(mediasData);
    } catch (error) {
      console.error('Error fetching campaign medias:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    } else {
      setCampaigns([]);
      setActiveCampaign(null);
      setCampaignMedias([]);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeCampaign) {
      fetchCampaignMedias(activeCampaign.id);
    } else {
      setCampaignMedias([]);
    }
  }, [activeCampaign, user]);

  const createCampaign = async (name: string): Promise<string> => {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const campaignRef = await addDoc(collection(db, 'campaigns'), {
        userId: user.uid,
        name: name.trim(),
        status: 'draft',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Busca a campanha recém-criada
      const newCampaignDoc = await getDoc(doc(db, 'campaigns', campaignRef.id));
      if (newCampaignDoc.exists()) {
        const newCampaign = {
          id: newCampaignDoc.id,
          ...newCampaignDoc.data(),
        } as Campaign;
        setActiveCampaign(newCampaign);
      }

      await fetchCampaigns();

      return campaignRef.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  };

  const addMediaToCampaign = async (
    campaignId: string,
    mediaId: string,
    startDate: Date,
    endDate: Date,
    quantity: number,
    priceType: 'biweek' | 'month',
    totalPrice: number
  ): Promise<void> => {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado');
    }

    try {
      await addDoc(collection(db, 'campaignMedias'), {
        campaignId,
        mediaId,
        userId: user.uid,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        quantity,
        priceType,
        totalPrice,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Atualiza o status da campanha para pending_payment
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'pending_payment',
        updatedAt: Timestamp.now(),
      });

      await fetchCampaignMedias(campaignId);
      await fetchCampaigns();
    } catch (error) {
      console.error('Error adding media to campaign:', error);
      throw error;
    }
  };

  const getCampaignMedias = (campaignId: string): CampaignMedia[] => {
    return campaignMedias.filter(cm => cm.campaignId === campaignId);
  };

  const getCampaignTotalPrice = (campaignId: string): number => {
    return campaignMedias
      .filter(cm => cm.campaignId === campaignId && cm.totalPrice)
      .reduce((sum, cm) => sum + (cm.totalPrice || 0), 0);
  };

  const deleteCampaign = async (campaignId: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Verifica se a campanha pertence ao usuário
      const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
      if (!campaignDoc.exists()) {
        throw new Error('Campanha não encontrada');
      }

      const campaign = campaignDoc.data();
      if (campaign.userId !== user.uid) {
        throw new Error('Você não tem permissão para excluir esta campanha');
      }

      // Busca todas as mídias da campanha
      const campaignMediasQuery = query(
        collection(db, 'campaignMedias'),
        where('campaignId', '==', campaignId)
      );
      const campaignMediasSnapshot = await getDocs(campaignMediasQuery);

      // Deleta todas as mídias da campanha
      const deletePromises = campaignMediasSnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'campaignMedias', docSnap.id))
      );
      await Promise.all(deletePromises);

      // Deleta a campanha
      await deleteDoc(doc(db, 'campaigns', campaignId));

      // Se a campanha deletada era a ativa, limpa a campanha ativa
      if (activeCampaign?.id === campaignId) {
        setActiveCampaign(null);
      }

      // Atualiza a lista de campanhas
      await fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        activeCampaign,
        campaignMedias,
        loading,
        createCampaign,
        addMediaToCampaign,
        deleteCampaign,
        setActiveCampaign,
        getCampaignMedias,
        getCampaignTotalPrice,
        refetch: fetchCampaigns,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}

