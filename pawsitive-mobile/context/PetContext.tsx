import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// 🐾 Define Pet Type
export type Pet = {
  id: string;
  name: string;
  type: 'Dog' | 'Cat' | 'Bird' | 'Other';
  breed?: string;
  weight?: string;
  avatar: string;
};

// 🐾 Default placeholder (fallback when no pets exist)
const DEFAULT_PET: Pet = {
  id: 'default',
  name: 'Add a Pet',
  type: 'Dog',
  avatar: 'https://img.freepik.com/free-photo/isolated-happy-smiling-dog-white-background-portrait-4_1562-693.jpg'
};

const PetContext = createContext<any>(null);

export const PetProvider = ({ children }: any) => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet>(DEFAULT_PET);
  const [loading, setLoading] = useState(true);

  // 🔄 Fetch pets from Supabase on mount
  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pets:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Convert database pets to Pet type
        const formattedPets: Pet[] = data.map(pet => ({
          id: pet.id,
          name: pet.name,
          type: pet.species === 'dog' ? 'Dog' : pet.species === 'cat' ? 'Cat' : 'Other',
          breed: pet.breed || undefined,
          weight: pet.weight_kg ? `${pet.weight_kg}kg` : undefined,
          avatar: pet.profile_photo_url || (pet.species === 'cat' 
            ? 'https://img.freepik.com/free-photo/close-up-adorable-cat-looking-camera_23-2149167387.jpg'
            : 'https://img.freepik.com/free-photo/isolated-happy-smiling-dog-white-background-portrait-4_1562-693.jpg')
        }));

        setPets(formattedPets);
        setActivePet(formattedPets[0]); // Set first pet as active
      } else {
        // No pets found, use default
        setPets([]);
        setActivePet(DEFAULT_PET);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchPets:', error);
      setLoading(false);
    }
  };

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
    <PetContext.Provider value={{ activePet, setActivePet, pets, addPet, fetchPets, loading }}>
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => useContext(PetContext);