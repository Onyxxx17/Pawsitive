import { create } from 'zustand';
import { Pet } from '@/types';

interface PetsState {
  pets: Pet[];
  currentPetId: string;
  setCurrentPet: (petId: string) => void;
  addPet: (pet: Pet) => void;
}

export const usePetsStore = create<PetsState>((set) => ({
  pets: [
    {
      id: '1',
      name: 'Mochi',
      species: 'dog',
      breed: 'Poodle',
      age: 2,
      weight: 5.2,
      imageUrl: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=150',
      healthProfile: {
        coatScore: 8,
        fitScore: 7,
        teethScore: 9,
        poopScore: 8,
        faceScore: 7,
        overallScore: 8.2,
        lastChecked: new Date(),
      },
    },
  ],
  currentPetId: '1',
  setCurrentPet: (petId) => set({ currentPetId: petId }),
  addPet: (pet) => set((state) => ({ pets: [...state.pets, pet] })),
}));
