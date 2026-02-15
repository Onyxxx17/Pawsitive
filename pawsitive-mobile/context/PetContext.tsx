import React, { createContext, useState, useContext } from 'react';

// 🐾 Define Pet Type
export type Pet = {
  id: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Bird' | 'Other';
  breed?: string;
  weight?: string;
  avatar: string;
};

// 🐾 Default Data (Placeholder until they sign up)
const DEFAULT_PETS: Pet[] = [
  { id: '1', name: 'Buddy', type: 'Dog', avatar: 'https://img.freepik.com/free-photo/isolated-happy-smiling-dog-white-background-portrait-4_1562-693.jpg' },
  { id: '2', name: 'Luna', type: 'Cat', avatar: 'https://img.freepik.com/free-photo/close-up-adorable-cat-looking-camera_23-2149167387.jpg' },
];

const PetContext = createContext<any>(null);

export const PetProvider = ({ children }: any) => {
  const [pets, setPets] = useState<Pet[]>(DEFAULT_PETS);
  const [activePet, setActivePet] = useState<Pet>(DEFAULT_PETS[0]);

  // 📝 Function to Register a New Pet (Sign Up)
  const addPet = (name: string, type: any) => {
    const newPet: Pet = {
      id: Date.now().toString(),
      name: name,
      type: type || 'Dog',
      avatar: type === 'Cat' 
        ? 'https://img.freepik.com/free-photo/close-up-adorable-cat-looking-camera_23-2149167387.jpg' 
        : 'https://img.freepik.com/free-photo/isolated-happy-smiling-dog-white-background-portrait-4_1562-693.jpg' 
    };
    
    // Add to list and make active immediately
    setPets([newPet, ...pets]);
    setActivePet(newPet);
  };

  return (
    <PetContext.Provider value={{ activePet, setActivePet, pets, addPet }}>
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => useContext(PetContext);