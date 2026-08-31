export interface BookPage {
  text: string;
  imageUrl: string;
  translationText?: string; // Secondary support language translation
  kidFeedback?: string;
  imagePrompt?: string;
}

export interface SavedBook {
  id: string;
  profileId: string; // Links book to child profile
  title: string;
  genre: string;
  primaryLang: string; // Story's main language
  supportLang?: string; // Story's translation language (optional)
  createdAt: number;
  pages: BookPage[];
  lessonsCovered: string[];
  status: 'in-progress' | 'completed';
  lastReadPageIndex: number;
}

export interface ChildProfile {
  id: string;
  name: string;
  birthdate: string; // YYYY-MM-DD
  pin: string; // 4-digit code
  ideologiesWhitelist: string[];
  ideologiesBlacklist: string[];
  lessons: string[];
  lessonStats: Record<string, number>;
}

export interface ParentSettings {
  pin: string;
}

export interface AppState {
  settings: ParentSettings;
  profiles: ChildProfile[];
  activeProfileId: string | null;
}
