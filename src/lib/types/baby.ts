// /types/baby.ts
export type Baby = {
  id: string;
  name: string;
  birthDate?: Date | null;
  gender?: string | null;
  photoUrl?: string | null;
};