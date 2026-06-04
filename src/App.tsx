import React, { useState, useEffect } from 'react';
import KidMode from './components/KidMode';
import ParentMode from './components/ParentMode';
import { AppState, SavedBook, ParentSettings } from './types';
import { BookOpen, Settings } from 'lucide-react';

const DEFAULT_SETTINGS: ParentSettings = {
  pin: '1234',
  ideologiesWhitelist: ['kindness', 'sharing'],
  ideologiesBlacklist: ['violence', 'swearing'],
  lessons: ['counting from 1 to 10'],
};

const DEFAULT_APP_STATE: AppState = {
  settings: DEFAULT_SETTINGS,
  savedBooks: [],
  lessonStats: {},
};

type ViewMode = 'home' | 'kid' | 'parent';

export default function App() {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [view, setView] = useState<ViewMode>('home');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('appState');
    if (saved) {
      try {
        setAppState(JSON.parse(saved));
      } catch (e) {
        console.error("Local storage parse error", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('appState', JSON.stringify(appState));
    }
  }, [appState, isLoaded]);

  const handleUpdateSettings = (s: ParentSettings) => {
    setAppState(prev => ({ ...prev, settings: s }));
  };

  const handleSaveBook = (book: SavedBook) => {
    setAppState(prev => {
      const stats = { ...prev.lessonStats };
      book.lessonsCovered.forEach(l => {
        stats[l] = (stats[l] || 0) + 1;
      });
      return {
        ...prev,
        savedBooks: [...prev.savedBooks, book],
        lessonStats: stats,
      };
    });
  };

  const handleDeleteBook = (id: string) => {
    setAppState(prev => ({
      ...prev,
      savedBooks: prev.savedBooks.filter(b => b.id !== id),
    }));
  };

  if (!isLoaded) return null;

  if (view === 'kid') {
    return <KidMode settings={appState.settings} onSaveBook={handleSaveBook} onExit={() => setView('home')} />;
  }

  if (view === 'parent') {
    return <ParentMode appState={appState} onUpdateSettings={handleUpdateSettings} onDeleteBook={handleDeleteBook} onExit={() => setView('home')} />;
  }

  // Home View
  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-[#d9e2d5] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-10 right-10 w-64 h-64 bg-[#ebd9c1] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-64 h-64 bg-[#e8e4d9] rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <div className="z-10 text-center mb-16">
        <h1 className="text-6xl md:text-8xl font-black font-serif text-[#3d3a2e] drop-shadow-md tracking-tighter mb-4">
          StoryMagic
        </h1>
        <p className="text-2xl font-bold text-[#7a8d7d]">Where your imagination comes alive!</p>
      </div>

      <div className="z-10 flex flex-col md:flex-row gap-8 items-center w-full max-w-4xl justify-center">
        
        <button 
          onClick={() => setView('kid')}
          className="group relative w-full md:w-1/2 bg-white rounded-[40px] p-10 shadow-sm border border-[#e8e4d9] hover:border-[#7a8d7d] hover:-translate-y-2 transition-all cursor-pointer flex flex-col items-center"
        >
          <div className="bg-[#f9f8f2] p-8 rounded-full mb-6 group-hover:bg-[#7a8d7d] group-hover:text-white transition-colors text-[#7a8d7d]">
            <BookOpen className="w-20 h-20" />
          </div>
          <h2 className="text-4xl font-bold text-[#4a4636]">Kids Area</h2>
          <p className="text-[#9a9483] mt-2 font-medium">Read and create stories!</p>
        </button>

        <button 
          onClick={() => setView('parent')}
          className="group relative w-full md:w-1/2 bg-white rounded-[40px] p-10 shadow-sm border border-[#e8e4d9] hover:border-[#c9b7a2] hover:-translate-y-2 transition-all cursor-pointer flex flex-col items-center"
        >
          <div className="bg-[#f9f8f2] p-8 rounded-full mb-6 group-hover:bg-[#c9b7a2] group-hover:text-white transition-colors text-[#c9b7a2]">
            <Settings className="w-20 h-20" />
          </div>
          <h2 className="text-4xl font-bold text-[#4a4636]">Parents</h2>
          <p className="text-[#9a9483] mt-2 font-medium">Settings & Dashboard</p>
        </button>

      </div>
    </div>
  );
}

