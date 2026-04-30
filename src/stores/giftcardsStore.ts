import { create } from 'zustand';
import { giftcardsApi } from '@/api/giftcards.api';
import {
  GiftCard,
  GiftCardCreateRequest,
  GiftCardRedeemRequest,
  GiftCardRevertRequest,
  GiftCardStatus,
} from '@/types/giftcard.types';

interface GiftCardsState {
  giftCards: GiftCard[];
  currentGiftCard: GiftCard | null;
  loading: boolean;
  error: string | null;
  fetchGiftCards: (filters?: { search?: string; status?: GiftCardStatus; expiringBefore?: string }) => Promise<void>;
  fetchGiftCardById: (id: number) => Promise<void>;
  createGiftCard: (data: GiftCardCreateRequest) => Promise<GiftCard>;
  updateGiftCard: (id: number, data: GiftCardCreateRequest) => Promise<GiftCard>;
  redeemGiftCard: (id: number, data: GiftCardRedeemRequest) => Promise<GiftCard>;
  revertGiftCardRedeem: (id: number, data: GiftCardRevertRequest) => Promise<GiftCard>;
  cancelGiftCard: (id: number, note?: string) => Promise<GiftCard>;
  clearError: () => void;
}

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export const useGiftCardsStore = create<GiftCardsState>((set) => ({
  giftCards: [],
  currentGiftCard: null,
  loading: false,
  error: null,

  fetchGiftCards: async (filters) => {
    set({ loading: true, error: null });
    try {
      const giftCards = await giftcardsApi.list(filters);
      set({ giftCards, loading: false });
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al cargar giftcards';
      set({ error: message, loading: false });
      throw error;
    }
  },

  fetchGiftCardById: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentGiftCard = await giftcardsApi.getById(id);
      set({ currentGiftCard, loading: false });
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al cargar giftcard';
      set({ error: message, loading: false });
      throw error;
    }
  },

  createGiftCard: async (data) => {
    set({ loading: true, error: null });
    try {
      const created = await giftcardsApi.create(data);
      set((state) => ({ giftCards: [created, ...state.giftCards], currentGiftCard: created, loading: false }));
      return created;
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al crear giftcard';
      set({ error: message, loading: false });
      throw error;
    }
  },

  updateGiftCard: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await giftcardsApi.update(id, data);
      set((state) => ({
        giftCards: state.giftCards.map((gc) => (gc.id === id ? updated : gc)),
        currentGiftCard: updated,
        loading: false,
      }));
      return updated;
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al actualizar giftcard';
      set({ error: message, loading: false });
      throw error;
    }
  },

  redeemGiftCard: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await giftcardsApi.redeem(id, data);
      set((state) => ({
        giftCards: state.giftCards.map((gc) => (gc.id === id ? updated : gc)),
        currentGiftCard: updated,
        loading: false,
      }));
      return updated;
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al canjear giftcard';
      set({ error: message, loading: false });
      throw error;
    }
  },

  revertGiftCardRedeem: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await giftcardsApi.revert(id, data);
      set((state) => ({
        giftCards: state.giftCards.map((gc) => (gc.id === id ? updated : gc)),
        currentGiftCard: updated,
        loading: false,
      }));
      return updated;
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al revertir canje';
      set({ error: message, loading: false });
      throw error;
    }
  },

  cancelGiftCard: async (id, note) => {
    set({ loading: true, error: null });
    try {
      const updated = await giftcardsApi.cancel(id, note);
      set((state) => ({
        giftCards: state.giftCards.map((gc) => (gc.id === id ? updated : gc)),
        currentGiftCard: updated,
        loading: false,
      }));
      return updated;
    } catch (error) {
      const err = error as ApiError;
      const message = err.response?.data?.error?.message || 'Error al anular giftcard';
      set({ error: message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
