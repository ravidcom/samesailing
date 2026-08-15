import type { PartyType } from "@/lib/auth-context";
import type { NameMode } from "@/lib/displayName";

export type Kid = { gender: string; age: string };

export type OnboardingFormData = {
  name: string;
  email: string;
  password: string;
  partyType: PartyType | null;
  kids: Kid[];
  ageRanges: string[];
  gender: string | null;
  groupSize: string;
  bio: string;
  country: string;
  goals: string[];
  lgbtq: boolean;
  nameMode: NameMode;
  nickname: string;
  lastInitial: string;
  notifyActivity: boolean;
  notifyRecs: boolean;
  agreedTerms: boolean;
};

export const emptyFormData: OnboardingFormData = {
  name: "",
  email: "",
  password: "",
  partyType: null,
  kids: [],
  ageRanges: [],
  gender: null,
  groupSize: "2 people",
  bio: "",
  country: "",
  goals: [],
  lgbtq: false,
  nameMode: "anon",
  nickname: "",
  lastInitial: "",
  notifyActivity: false,
  notifyRecs: false,
  agreedTerms: false,
};

export type StepProps = {
  data: OnboardingFormData;
  update: (patch: Partial<OnboardingFormData>) => void;
  error: string;
};
