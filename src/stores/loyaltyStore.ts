import { create } from 'zustand';
import { LoyaltyReward } from '../types/loyalty.types';
import { loyaltyApi } from '../api/loyalty.api';
import { toast } from 'react-toastify';

interface LoyaltyState {
  rewards: LoyaltyReward[];
  loading: boolean;
  
  // Actions
  fetchRewards: () => Promise<void>;
  createReward: (name: string) => Promise<void>;
  updateReward: (id: number, name: string) => Promise<void>;
  deleteReward: (id: number) => Promise<void>;
  reorderRewards: (ids: number[]) => Promise<void>;
}

export const useLoyaltyStore = create<LoyaltyState>((set) => ({
  rewards: [],
  loading: false,

  fetchRewards: async () => {
    set({ loading: true });
    try {
      const rewards = await loyaltyApi.list();
      set({ rewards, loading: false });
    } catch (error) {
      console.error('Error fetching rewards:', error);
      set({ loading: false });
    }
  },

  createReward: async (name: string) => {
    try {
      await loyaltyApi.create({ name });
      const rewards = await loyaltyApi.list();
      set({ rewards });
      toast.success('Premio agregado');
    } catch (error) {
      toast.error('Error al agregar premio');
    }
  },

  updateReward: async (id: number, name: string) => {
    try {
      await loyaltyApi.update(id, { name });
      const rewards = await loyaltyApi.list();
      set({ rewards });
      toast.success('Premio actualizado');
    } catch (error) {
      toast.error('Error al actualizar premio');
    }
  },

  deleteReward: async (id: number) => {
    try {
      await loyaltyApi.delete(id);
      const rewards = await loyaltyApi.list();
      set({ rewards });
      toast.success('Premio eliminado');
    } catch (error) {
      toast.error('Error al eliminar premio');
    }
  },

  reorderRewards: async (ids: number[]) => {
    try {
      await loyaltyApi.reorder(ids);
      const rewards = await loyaltyApi.list();
      set({ rewards });
    } catch (error) {
      toast.error('Error al reordenar premios');
    }
  },
}));
