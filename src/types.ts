export interface BookPage {
  text: string;
  imageUrl: string;
  kidFeedback?: string;
  imagePrompt?: string;
}

export interface SavedBook {
  id: string;
  title: string;
  genre: string;
  createdAt: number;
  pages: BookPage[];
  lessonsCovered: string[];
}

export interface ParentSettings {
  pin: string;
  ideologiesWhitelist: string[];
  ideologiesBlacklist: string[];
  lessons: string[];
}

export interface AppState {
  settings: ParentSettings;
  savedBooks: SavedBook[];
  lessonStats: Record<string, number>; 
}
