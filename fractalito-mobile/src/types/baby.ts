// instructions manuals or blueprints for the baby timeline feature - defining data structures, constants, and utility functions related to babies and their developmental milestones
// they dont create anything by themselves but they tell the rest of the code how to create and manage baby timelines, moments, and access control

export type BabyAccessRole = 'parent' | 'angel';
export type AngelPermission = 'view' | 'contribute';
export type AccessStatus = 'pending' | 'accepted';

export interface Baby {
  id: string;
  name: string;
  username: string;
  dateOfBirth: Date;
  timeOfBirth?: string; // HH:mm format
  placeOfBirth?: string;
  color?: string; // Custom color for baby timeline
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BabyAccess {
  id: string;
  babyId: string;
  userId: string;
  role: BabyAccessRole;
  permission?: AngelPermission;
  status: AccessStatus;
  invitedBy: string;
  createdAt: Date;
  // Joined profile data
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface BabyMoment {
  id: string;
  babyId: string;
  originalMomentId?: string;
  sharedBy: string;
  sharedAt: Date;
  startTime: number;
  endTime?: number;
  yPosition: number;
  width?: number;
  height?: number;
  description: string;
  people?: string;
  location?: string;
  category: 'business' | 'personal';
  memorable: boolean;
  photoUrl?: string;
}

// Developmental milestone hints (non-evaluative, informational only)
export interface DevelopmentalHint {
  ageWeeks: number;
  label: string;
  hint: string;
}

export const DEVELOPMENTAL_HINTS: DevelopmentalHint[] = [
  { ageWeeks: 6, label: '6 weeks', hint: 'First smiles often appear' },
  { ageWeeks: 8, label: '2 months', hint: 'Starting to track objects with eyes' },
  { ageWeeks: 12, label: '3 months', hint: 'Head control developing' },
  { ageWeeks: 16, label: '4 months', hint: 'Reaching for objects begins' },
  { ageWeeks: 24, label: '6 months', hint: 'Sitting with support' },
  { ageWeeks: 36, label: '9 months', hint: 'Crawling may begin' },
  { ageWeeks: 52, label: '1 year', hint: 'First steps often appear' },
  { ageWeeks: 60, label: '14 months', hint: 'First words emerging' },
  { ageWeeks: 78, label: '18 months', hint: 'Walking confidently' },
  { ageWeeks: 104, label: '2 years', hint: 'Two-word phrases' },
  { ageWeeks: 130, label: '2.5 years', hint: 'Imaginative play developing' },
  { ageWeeks: 156, label: '3 years', hint: 'Full sentences, ready for preschool' },
];

// Get the age in weeks from birth date
export function getAgeInWeeks(dateOfBirth: Date, currentDate: Date = new Date()): number {
  const diffMs = currentDate.getTime() - dateOfBirth.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

// Get the age in months from birth date
export function getAgeInMonths(dateOfBirth: Date, currentDate: Date = new Date()): number {
  const diffMs = currentDate.getTime() - dateOfBirth.getTime();
  return Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
}

// Check if baby axis should be visible (< 3 years old)
export function isBabyAxisVisible(dateOfBirth: Date, currentDate: Date = new Date()): boolean {
  const threeYearsMs = 3 * 365.25 * 24 * 60 * 60 * 1000;
  return currentDate.getTime() - dateOfBirth.getTime() < threeYearsMs;
}

// Get opacity for fade effect as baby approaches 3 years
export function getBabyAxisOpacity(dateOfBirth: Date, currentDate: Date = new Date()): number {
  const ageMs = currentDate.getTime() - dateOfBirth.getTime();
  const threeYearsMs = 3 * 365.25 * 24 * 60 * 60 * 1000;
  const twoAndHalfYearsMs = 2.5 * 365.25 * 24 * 60 * 60 * 1000;
  
  if (ageMs < twoAndHalfYearsMs) return 1;
  if (ageMs >= threeYearsMs) return 0;
  
  // Fade from 1 to 0 between 2.5 and 3 years
  return 1 - (ageMs - twoAndHalfYearsMs) / (threeYearsMs - twoAndHalfYearsMs);
}
