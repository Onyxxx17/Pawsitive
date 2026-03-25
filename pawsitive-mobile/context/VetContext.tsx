import React, { createContext, useCallback, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type VetData = {
  id: string;
  name: string;
  email: string;
  clinic_name: string;
  specializations: string[];
  bio: string;
  profile_photo_url: string;
  license_number: string;
  years_experience: number;
  consultation_fee: number;
  languages: string[];
  rating: number;
  total_reviews: number;
  is_active: boolean;
};

type VetContextType = {
  vet: VetData | null;
  vetId: string | null;
  loading: boolean;
  setVetSession: (vet: VetData | null) => Promise<void>;
  clearVetSession: () => Promise<void>;
};

const VetContext = createContext<VetContextType | undefined>(undefined);
const VET_SESSION_STORAGE_KEY = '@pawsitive/vet-session';

export const VetProvider = ({ children }: { children: ReactNode }) => {
  const [vet, setVet] = useState<VetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rawSession = await AsyncStorage.getItem(VET_SESSION_STORAGE_KEY);
        if (!rawSession || !mounted) {
          return;
        }

        const parsedSession = JSON.parse(rawSession) as VetData | null;
        if (parsedSession?.id && mounted) {
          setVet(parsedSession);
        }
      } catch (error) {
        console.error('Failed to restore veterinarian session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setVetSession = useCallback(async (nextVet: VetData | null) => {
    if (!nextVet) {
      setVet(null);
      await AsyncStorage.removeItem(VET_SESSION_STORAGE_KEY);
      return;
    }

    setVet(nextVet);
    await AsyncStorage.setItem(VET_SESSION_STORAGE_KEY, JSON.stringify(nextVet));
  }, []);

  const clearVetSession = useCallback(async () => {
    setVet(null);
    await AsyncStorage.removeItem(VET_SESSION_STORAGE_KEY);
  }, []);

  const value = useMemo<VetContextType>(
    () => ({
      vet,
      vetId: vet?.id ?? null,
      loading,
      setVetSession,
      clearVetSession,
    }),
    [clearVetSession, loading, setVetSession, vet],
  );

  return (
    <VetContext.Provider value={value}>
      {children}
    </VetContext.Provider>
  );
};

export const useVet = () => {
  const context = useContext(VetContext);
  if (context === undefined) {
    throw new Error('useVet must be used within a VetProvider');
  }
  return context;
};
