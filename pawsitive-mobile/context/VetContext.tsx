import React, { createContext, useState, useContext, ReactNode } from 'react';

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
  setVet: (vet: VetData | null) => void;
  vetId: string | null;
  setVetId: (id: string | null) => void;
};

const VetContext = createContext<VetContextType | undefined>(undefined);

export const VetProvider = ({ children }: { children: ReactNode }) => {
  const [vet, setVet] = useState<VetData | null>(null);
  const [vetId, setVetId] = useState<string | null>(null);

  return (
    <VetContext.Provider value={{ vet, setVet, vetId, setVetId }}>
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
