export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  age: number;
  weight: number;
  imageUrl?: string;
  healthProfile: HealthProfile;
}

export interface HealthProfile {
  coatScore: number;
  fitScore: number;
  teethScore: number;
  poopScore: number;
  faceScore: number;
  overallScore: number;
  lastChecked: Date;
}
