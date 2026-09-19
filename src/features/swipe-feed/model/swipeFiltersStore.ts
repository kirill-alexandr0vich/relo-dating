import { create } from 'zustand';
import { DEFAULT_SWIPE_FILTERS, type SwipeFilters } from './filterTypes';

interface SwipeFiltersState {
  filters: SwipeFilters;
  setFilters: (filters: SwipeFilters) => void;
}

export const useSwipeFiltersStore = create<SwipeFiltersState>(set => ({
  filters: DEFAULT_SWIPE_FILTERS,
  setFilters: filters => set({ filters }),
}));
