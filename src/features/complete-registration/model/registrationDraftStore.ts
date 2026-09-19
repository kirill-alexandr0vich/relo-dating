import { create } from 'zustand';

interface RegistrationDraftState {
  name: string;
  country: string | null;
  nativeLanguage: string | null;
  setName: (name: string) => void;
  setCountry: (country: string) => void;
  setNativeLanguage: (nativeLanguage: string) => void;
  reset: () => void;
}

export const useRegistrationDraftStore = create<RegistrationDraftState>(
  set => ({
    name: '',
    country: null,
    nativeLanguage: null,
    setName: name => set({ name }),
    setCountry: country => set({ country }),
    setNativeLanguage: nativeLanguage => set({ nativeLanguage }),
    reset: () => set({ name: '', country: null, nativeLanguage: null }),
  }),
);
