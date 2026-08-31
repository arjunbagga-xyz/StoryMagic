import React, { useState, useEffect } from 'react';
import KidMode from './components/KidMode';
import ParentMode from './components/ParentMode';
import NewsletterSignup from './components/NewsletterSignup';
import { AppState, SavedBook, ParentSettings, ChildProfile } from './types';
import { BookOpen, Settings, ArrowLeft } from 'lucide-react';
import { getBooksFromDb, saveBookToDb, deleteBookFromDb } from './indexedDb';
import { track, analyticsEnabled } from './analytics';

const DEFAULT_SETTINGS: ParentSettings = {
  pin: '1234',
};

const DEFAULT_APP_STATE: AppState = {
  settings: DEFAULT_SETTINGS,
  profiles: [],
  activeProfileId: null,
};

type ViewMode = 'home' | 'kid' | 'parent';

export default function App() {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [view, setView] = useState<ViewMode>('home');
  const [isLoaded, setIsLoaded] = useState(false);

  // States for child PIN gate
  const [selectedProfForPin, setSelectedProfForPin] = useState<ChildProfile | null>(null);
  const [profilePinInput, setProfilePinInput] = useState('');
  const [profilePinError, setProfilePinError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('appState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up legacy savedBooks or lessonStats if any
        if (parsed.savedBooks) delete parsed.savedBooks;
        if (parsed.lessonStats) delete parsed.lessonStats;
        
        setAppState(prev => ({
          ...prev,
          ...parsed,
          activeProfileId: null // reset on reload
        }));
      } catch (e) {
        console.error("Local storage parse error", e);
      }
    }

    // Load IndexedDB books
    getBooksFromDb().then(books => {
      setSavedBooks(books);
    }).catch(err => {
      console.error("IndexedDB load error:", err);
    });

    setIsLoaded(true);
    track('app_open');
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const { settings, profiles } = appState;
      localStorage.setItem('appState', JSON.stringify({ settings, profiles }));
    }
  }, [appState, isLoaded]);

  const handleUpdateSettings = (s: ParentSettings) => {
    setAppState(prev => ({ ...prev, settings: s }));
  };

  const handleUpdateProfiles = (p: ChildProfile[]) => {
    setAppState(prev => ({ ...prev, profiles: p }));
  };

  const handleSaveBook = async (book: SavedBook) => {
    try {
      await saveBookToDb(book);
      setSavedBooks(prev => {
        const index = prev.findIndex(b => b.id === book.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = book;
          return updated;
        }
        return [...prev, book];
      });

      // Update statistics in the child profile only if book newly finishes
      if (book.status === 'completed') {
        setAppState(prev => {
          const updatedProfiles = (prev.profiles || []).map(p => {
            if (p.id === book.profileId) {
              const stats = { ...(p.lessonStats || {}) };
              book.lessonsCovered.forEach(l => {
                stats[l] = (stats[l] || 0) + 1;
              });
              return {
                ...p,
                lessonStats: stats
              };
            }
            return p;
          });
          return {
            ...prev,
            profiles: updatedProfiles
          };
        });
      }
    } catch (e) {
      console.error("Error saving book to DB:", e);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBookFromDb(id);
      setSavedBooks(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      console.error("Error deleting book from DB:", e);
    }
  };

  const handleProfileSelect = (prof: ChildProfile) => {
    setSelectedProfForPin(prof);
    setProfilePinInput('');
    setProfilePinError(false);
  };

  const handleProfilePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfForPin) return;
    if (profilePinInput === selectedProfForPin.pin) {
      setAppState(prev => ({ ...prev, activeProfileId: selectedProfForPin.id }));
      setSelectedProfForPin(null);
      setProfilePinInput('');
      setProfilePinError(false);
    } else {
      setProfilePinError(true);
      setProfilePinInput('');
    }
  };

  if (!isLoaded) return null;

  // PROFILE PIN GATE MODAL
  if (view === 'kid' && selectedProfForPin) {
    return (
      <div className="min-h-screen bg-[#7a8d7d] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-[32px] shadow-lg max-w-md w-full text-center border border-[#e8e4d9]">
          <h2 className="text-3xl font-serif font-bold text-[#3d3a2e] mb-2">{selectedProfForPin.name}'s Profile</h2>
          <p className="text-[#8c887a] font-medium mb-6">Enter your 4-digit code to start reading!</p>
          <form onSubmit={handleProfilePinSubmit} className="flex flex-col gap-4">
            <input 
              type="password"
              maxLength={4}
              placeholder="PIN"
              value={profilePinInput}
              onChange={(e) => setProfilePinInput(e.target.value.replace(/\D/g, ''))}
              className="px-4 py-4 rounded-2xl bg-[#fdfcf0] text-[#4a4636] border border-[#e8e4d9] focus:border-[#7a8d7d] text-center text-3xl tracking-[0.5em] font-mono outline-none"
              autoFocus
            />
            {profilePinError && <p className="text-red-500 text-sm font-semibold">Incorrect PIN code. Try again!</p>}
            <button type="submit" className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold py-4 rounded-2xl transition-colors cursor-pointer">
              Enter 🚀
            </button>
            <button 
              type="button" 
              onClick={() => setSelectedProfForPin(null)} 
              className="text-[#9a9483] hover:text-[#4a4636] font-bold text-sm mt-2 transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PROFILE SWITCHER VIEW
  if (view === 'kid' && !appState.activeProfileId) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
        <div className="absolute top-10 left-10 w-64 h-64 bg-[#d9e2d5] rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-[#ebd9c1] rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        
        <button onClick={() => setView('home')} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] rounded-full shadow-sm hover:bg-[#f9f8f2] flex items-center gap-2 text-[#7a8d7d] font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5"/> Back
        </button>

        <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#3d3a2e] mb-12 text-center">Who is reading today?</h1>

        {appState.profiles.length === 0 ? (
          <div className="bg-white p-10 rounded-[32px] shadow-sm border border-[#e8e4d9] text-center max-w-md z-10">
            <p className="text-[#8c887a] font-medium mb-6 leading-relaxed">No child profiles found. Parents, please log in to the Parents dashboard to create a reader profile first!</p>
            <button onClick={() => setView('parent')} className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold px-6 py-3 rounded-xl transition-colors w-full cursor-pointer">
              Go to Parent Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-4xl w-full justify-center z-10 px-4">
            {appState.profiles.map(prof => (
              <button
                key={prof.id}
                onClick={() => handleProfileSelect(prof)}
                className="bg-white hover:border-[#7a8d7d] border border-[#e8e4d9] shadow-sm hover:shadow-md rounded-[32px] p-8 text-center transition-all transform hover:-translate-y-1 flex flex-col items-center cursor-pointer"
              >
                <div className="text-5xl mb-4">👦</div>
                <h3 className="text-xl font-bold text-[#5a5646] truncate w-full">{prof.name}</h3>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'kid') {
    const activeProfile = appState.profiles.find(p => p.id === appState.activeProfileId);
    return (
      <KidMode 
        profile={activeProfile!}
        settings={appState.settings}
        savedBooks={savedBooks.filter(b => b.profileId === appState.activeProfileId)}
        onSaveBook={handleSaveBook} 
        onExit={() => {
          setAppState(prev => ({ ...prev, activeProfileId: null }));
          setView('home');
        }} 
      />
    );
  }

  if (view === 'parent') {
    return (
      <ParentMode 
        appState={appState} 
        onUpdateSettings={handleUpdateSettings} 
        onUpdateProfiles={handleUpdateProfiles}
        onExit={() => setView('home')} 
      />
    );
  }

  // Home View
  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
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

      {analyticsEnabled && (
        <div className="z-10 mt-10">
          <NewsletterSignup />
        </div>
      )}
    </div>
  );
}
