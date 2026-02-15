import React, { createContext, useState, useContext } from 'react';

// 🐾 Define our Pet Types
type Pet = {
  id: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Bird';
  avatar: string; // URL for the pet image
};

// 🐾 Sample Data
const PETS: Pet[] = [
  { id: '1', name: 'Mochi', type: 'Dog', avatar: 'https://img.freepik.com/free-photo/isolated-happy-smiling-dog-white-background-portrait-4_1562-693.jpg' },
  { id: '2', name: 'Luna', type: 'Cat', avatar: 'https://img.freepik.com/free-photo/close-up-adorable-cat-looking-camera_23-2149167387.jpg' },
  { id: '3', name: 'Coco', type: 'Bird', avatar: 'https://img.freepik.com/free-photo/beautiful-parrot-white-background_23-2148025251.jpg' },
];

const PetContext = createContext<any>(null);

export const PetProvider = ({ children }: any) => {
  const [activePet, setActivePet] = useState<Pet>(PETS[0]); // Default to Mochi

  return (
    <PetContext.Provider value={{ activePet, setActivePet, pets: PETS }}>
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => useContext(PetContext);