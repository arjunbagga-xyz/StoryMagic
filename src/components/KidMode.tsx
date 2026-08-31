import React, { useState } from 'react';
import { BookPage, SavedBook, ParentSettings, ChildProfile } from '../types';
import { Sparkles, ArrowRight, Save, Home, RefreshCcw, ArrowLeft, BookOpen, X, Search, Grid, List, Languages, PlayCircle } from 'lucide-react';
import { lookupLocally } from '../localDictionary';
import { DEMO_MODE } from '../demoFlag';
import { resolveDemoPages, DEMO_STORY } from '../demoData';
import { track } from '../analytics';

const STANDARD_GENRES = [
  'Action', 'Adventure', 'Horror', 'Comedy', 'Mystery', 'Satire', 
  'Science Fiction', 'Art', 'Non Fiction', 'Essays', 'How To Guides', 'Poetry'
];

const STANDARD_THEMES = [
  'Space Adventure', 'Magic Forest', 'Dinosaurs', 'Underwater World', 'Talking Animals', 'Superhero City',
  'Kindness', 'Sharing', 'Courage', 'Friendship', 'Curiosity', 'Perseverance', 'Honesty'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Mandarin Chinese', 
  'Mandarin Pinyin', 'Hindi', 'Hinglish (Romanized Hindi)', 'Japanese', 'Arabic'
];

const MAX_PAGES = 50;

export default function KidMode({
  profile,
  settings,
  savedBooks,
  onSaveBook,
  onExit,
}: {
  profile: ChildProfile;
  settings: ParentSettings;
  savedBooks: SavedBook[];
  onSaveBook: (book: SavedBook) => Promise<void>;
  onExit: () => void;
}) {
  // Customizer inputs
  const [mode, setMode] = useState<'guide' | 'read' | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [customGenre, setCustomGenre] = useState('');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customTheme, setCustomTheme] = useState('');

  // Multilingual states
  const [primaryLang, setPrimaryLang] = useState('English');
  const [supportLang, setSupportLang] = useState('');
  const [isDualLanguage, setIsDualLanguage] = useState(false);

  // Dictionary lookup popover states
  const [selectedText, setSelectedText] = useState('');
  const [showLookupCard, setShowLookupCard] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupData, setLookupData] = useState<{ definition: string; synonyms: string[]; translation: string; } | null>(null);
  const [lookupCoords, setLookupCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedTargetLang, setSelectedTargetLang] = useState('English');
  const [translationsCache, setTranslationsCache] = useState<Record<string, string>>({});
  const [translationLoading, setTranslationLoading] = useState(false);

  // Story generation page states
  const [pages, setPages] = useState<BookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [bookLessons, setBookLessons] = useState<string[]>([]);
  const [imageUnavailable, setImageUnavailable] = useState(false);

  // Active book tracking
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [currentBookTitle, setCurrentBookTitle] = useState('');

  // Bookmarks search and view states
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [bookmarkView, setBookmarkView] = useState<'grid' | 'list'>('grid');

  const calculateAge = (birthdate: string): number => {
    if (!birthdate) return 6;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const generateNextPage = async (
    targetBookId: string, 
    bookTitle: string, 
    storyGenre: string, 
    storyThemes: string[],
    kidFeedback: string = '', 
    currentPagesList: BookPage[] = [],
    bookPrimaryLang: string = primaryLang,
    bookSupportLang: string = isDualLanguage ? supportLang : ''
  ) => {
    setIsGeneratingText(true);
    try {
      const childAge = calculateAge(profile.birthdate);
      
      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: storyGenre,
          lessons: profile.lessons || [],
          ideologiesBlacklist: profile.ideologiesBlacklist || [],
          ideologiesWhitelist: storyThemes,
          currentPage: currentPagesList.length,
          maxPages: MAX_PAGES,
          previousPages: currentPagesList.map(p => ({ text: p.text, kidFeedback: p.kidFeedback })),
          kidFeedback,
          age: childAge,
          primaryLang: bookPrimaryLang,
          supportLang: bookSupportLang,
        }),
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      let updatedLessons = bookLessons;
      if (data.lessonsCovered) {
        updatedLessons = Array.from(new Set([...bookLessons, ...data.lessonsCovered]));
        setBookLessons(updatedLessons);
      }

      // 1. Render text immediately with image in 'LOADING' status
      const newPage: BookPage = {
        text: data.storyText,
        translationText: data.translationText || undefined,
        imageUrl: 'LOADING',
        imagePrompt: data.imagePrompt,
        kidFeedback,
      };

      const nextPages = [...currentPagesList, newPage];
      setPages(nextPages);
      setCurrentPageIndex(nextPages.length - 1);
      setIsGeneratingText(false);
      setFeedback('');

      // KPI: a story page was rendered -> counts as a "read".
      track('story_page_render', { page: nextPages.length, profile: profile.id, genre: storyGenre });

      const isCompleted = data.isEnd || nextPages.length >= MAX_PAGES;
      setIsDone(isCompleted);

      // Auto-save progress immediately to IndexedDB
      const inProgressBook: SavedBook = {
        id: targetBookId,
        profileId: profile.id,
        title: bookTitle,
        genre: storyGenre,
        primaryLang: bookPrimaryLang,
        supportLang: bookSupportLang || undefined,
        createdAt: Date.now(),
        pages: nextPages,
        lessonsCovered: updatedLessons,
        status: isCompleted ? 'completed' : 'in-progress',
        lastReadPageIndex: nextPages.length - 1
      };
      await onSaveBook(inProgressBook);

      // 2. Fetch image asynchronously in the background
      setIsGeneratingImage(true);
      try {
        const imgResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: data.imagePrompt }),
        });
        const imgData = await imgResponse.json();

        // Provider-agnostic: the backend returns `unavailable:true` + errorType (never a fake SVG).
        if (imgData.unavailable) {
          setImageUnavailable(true);
        }

        // Swapping loading card for illustration
        const finalImageUrl = imgData.imageUrl || 'https://picsum.photos/seed/placeholder/800/600';
        setPages(prev => {
          const updated = [...prev];
          if (updated[nextPages.length - 1]) {
            updated[nextPages.length - 1].imageUrl = finalImageUrl;
          }
          
          // Re-save completed image to database
          const finalBook: SavedBook = {
            ...inProgressBook,
            pages: updated
          };
          onSaveBook(finalBook);

          return updated;
        });

      } catch (err) {
        console.error("Image generation background error:", err);
      } finally {
        setIsGeneratingImage(false);
      }

    } catch (err) {
      console.error(err);
      alert('Uh oh! Something went wrong making your story. Let\'s try again!');
      setIsGeneratingText(false);
    }
  };

  const handleStartAdventure = () => {
    track('story_start', { profile: profile.id });

    // DEMO MODE: load the bundled sample story instead of hitting an AI backend.
    // Works with zero keys and zero network egress — used for the public demo site.
    if (DEMO_MODE) {
      const demoPages = resolveDemoPages();
      const demoBookId = 'demo-story';
      const demoTitle = DEMO_STORY.title;
      const initial = demoPages.slice(0, 1);
      setPages(initial);
      setCurrentPageIndex(0);
      setBookLessons([]);
      setIsDone(false);
      setImageUnavailable(false);
      setActiveBookId(demoBookId);
      setCurrentBookTitle(demoTitle);
      setMode('read');
      setPrimaryLang(DEMO_STORY.primaryLang);
      setIsDualLanguage(true);
      setSupportLang(DEMO_STORY.supportLang);
      // Auto-save the sample so it appears in the library too.
      onSaveBook({
        id: demoBookId,
        profileId: profile.id,
        title: demoTitle,
        genre: DEMO_STORY.genre,
        primaryLang: DEMO_STORY.primaryLang,
        supportLang: DEMO_STORY.supportLang,
        createdAt: Date.now(),
        pages: demoPages,
        lessonsCovered: [],
        status: 'completed',
        lastReadPageIndex: 0,
      });
      return;
    }

    const finalGenre = customGenre.trim() || genre || 'Adventure';
    const finalThemes = [...selectedThemes];
    if (customTheme.trim()) {
      finalThemes.push(customTheme.trim());
    }

    const defaultTitle = `Adventure of ${profile.name}`;
    const title = prompt('Give your book a super cool title!', `My ${finalGenre} Story`) || defaultTitle;

    const newBookId = Date.now().toString();

    setPages([]);
    setCurrentPageIndex(0);
    setBookLessons([]);
    setIsDone(false);
    setImageUnavailable(false);

    setActiveBookId(newBookId);
    setCurrentBookTitle(title);
    
    generateNextPage(
      newBookId, 
      title, 
      finalGenre, 
      finalThemes, 
      '', 
      [], 
      primaryLang, 
      isDualLanguage ? supportLang : ''
    );
  };

  const handleOpenBook = (book: SavedBook) => {
    setActiveBookId(book.id);
    setCurrentBookTitle(book.title);
    setGenre(book.genre);
    setPages(book.pages);
    setCurrentPageIndex(book.lastReadPageIndex);
    setBookLessons(book.lessonsCovered);
    setIsDone(book.status === 'completed' || book.pages.length >= MAX_PAGES);
    setMode(book.status === 'completed' ? 'read' : 'guide');
    setPrimaryLang(book.primaryLang || 'English');
    setSupportLang(book.supportLang || '');
    setIsDualLanguage(!!book.supportLang);
  };

  const activeBook = savedBooks.find(b => b.id === activeBookId);
  const isBookReadOnly = activeBook?.status === 'completed';

  const handleExitBook = async () => {
    if (activeBookId && activeBook) {
      const updatedBook: SavedBook = {
        ...activeBook,
        lastReadPageIndex: currentPageIndex
      };
      await onSaveBook(updatedBook);
    }
    setActiveBookId(null);
    setPages([]);
    setGenre(null);
    setMode(null);
    setSelectedText('');
    setShowLookupCard(false);
    setTranslationsCache({});
    setTranslationLoading(false);
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      const prevIdx = currentPageIndex - 1;
      setCurrentPageIndex(prevIdx);
      setSelectedText('');
      setShowLookupCard(false);
      if (activeBook) {
        onSaveBook({ ...activeBook, lastReadPageIndex: prevIdx });
      }
    }
  };

  const handlePageClickNext = () => {
    if (currentPageIndex < pages.length - 1) {
      const nextIdx = currentPageIndex + 1;
      setCurrentPageIndex(nextIdx);
      setSelectedText('');
      setShowLookupCard(false);
      if (activeBook) {
        onSaveBook({ ...activeBook, lastReadPageIndex: nextIdx });
      }
    }
  };

  const handleNextPage = () => {
    // DEMO MODE: reveal the next bundled page (with a brief "brewing" beat so the
    // page-turn feels alive), never calling an AI backend.
    if (DEMO_MODE && !isDone) {
      const demoPages = resolveDemoPages();
      if (currentPageIndex < demoPages.length - 1) {
        setIsGeneratingText(true);
        track('story_page_render', { page: currentPageIndex + 2, demo: 1 });
        setTimeout(() => {
          const nextIdx = currentPageIndex + 1;
          setPages(demoPages.slice(0, nextIdx + 1));
          setCurrentPageIndex(nextIdx);
          setIsDone(nextIdx >= demoPages.length - 1);
          setIsGeneratingText(false);
          setSelectedText('');
          setShowLookupCard(false);
        }, 650);
        return;
      }
    }

    if (currentPageIndex < pages.length - 1) {
      handlePageClickNext();
    } else if (!isDone) {
      const finalGenre = customGenre.trim() || genre || 'Adventure';
      const finalThemes = [...selectedThemes];
      if (customTheme.trim()) {
        finalThemes.push(customTheme.trim());
      }
      generateNextPage(
        activeBookId!,
        currentBookTitle,
        finalGenre,
        finalThemes,
        mode === 'guide' ? feedback : '',
        pages,
        activeBook?.primaryLang || primaryLang,
        activeBook?.supportLang || (isDualLanguage ? supportLang : '')
      );
    }
  };

  const handleSave = async () => {
    if (!activeBookId) return;
    const defaultTitle = currentBookTitle || `My ${genre} Story`;
    const title = prompt('Give your book a super cool title!', defaultTitle) || defaultTitle;
    
    const finalBook: SavedBook = {
      id: activeBookId,
      profileId: profile.id,
      title,
      genre: genre || 'Story',
      primaryLang: activeBook?.primaryLang || primaryLang,
      supportLang: activeBook?.supportLang || (isDualLanguage ? supportLang : undefined),
      createdAt: Date.now(),
      pages,
      lessonsCovered: bookLessons,
      status: 'completed',
      lastReadPageIndex: 0
    };

    await onSaveBook(finalBook);
    track('story_completed', { profile: profile.id, pages: pages.length });
    setActiveBookId(null);
    setPages([]);
    setGenre(null);
    setMode(null);
  };

  // Selection Lookups listener
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    if (text.length > 0) {
      setSelectedText(text);
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setLookupCoords({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + window.scrollY - 10
        });
      } catch (e) {
        setLookupCoords({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 });
      }
    } else {
      if (!showLookupCard) {
        setSelectedText('');
        setTranslationsCache({});
        setTranslationLoading(false);
      }
    }
  };

  const handleTriggerLookup = async () => {
    if (!selectedText) return;
    setShowLookupCard(true);
    setLookupLoading(true);
    setLookupData(null);
    setTranslationsCache({});
    setTranslationLoading(false);
    
    try {
      const activePrimary = activeBook?.primaryLang || primaryLang;
      const activeSupport = activeBook?.supportLang || supportLang || '';
      const childAge = calculateAge(profile.birthdate);

      // Default target language for translation: supportLang if set, otherwise first different language
      const defaultTarget = activeSupport || (activePrimary === 'English' ? 'Spanish' : 'English');
      setSelectedTargetLang(defaultTarget);

      // Check for local match if it's a single word (no spaces)
      const isSingleWord = !selectedText.trim().includes(' ');
      if (isSingleWord) {
        const localMatch = lookupLocally(selectedText);
        if (localMatch) {
          console.log("Local lookup match found for:", selectedText);
          setLookupData({
            definition: localMatch.definition,
            synonyms: localMatch.synonyms,
            translation: '' // translation fetched optionally later
          });
          setLookupLoading(false);
          return;
        }
      }

      // Fallback to API if not a single word or not found in local dictionary
      console.log("Fetching API lookup for:", selectedText);
      const res = await fetch('/api/define-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: selectedText,
          age: childAge,
          primaryLang: activePrimary,
          supportLang: defaultTarget
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLookupData(data);
    } catch (err) {
      console.error("Lookup error:", err);
      alert("Oops! We couldn't look up that text. Let's try again.");
      setShowLookupCard(false);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleTranslateTo = async (targetLang: string) => {
    if (!selectedText) return;

    // If we already have the translation, do nothing
    if (translationsCache[targetLang]) {
      return;
    }

    setTranslationLoading(true);
    try {
      const activePrimary = activeBook?.primaryLang || primaryLang;
      const res = await fetch('/api/translate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          from: activePrimary,
          to: targetLang
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTranslationsCache(prev => ({ ...prev, [targetLang]: data.translation }));
    } catch (err) {
      console.error("Translation error:", err);
      alert("Could not translate at this moment. Please try again.");
    } finally {
      setTranslationLoading(false);
    }
  };

  // 1. CONSOLIDATED MAIN PAGE (CUSTOMIZER + LIBRARY TOGETHER)
  if (!activeBookId) {
    const combinedThemes = Array.from(new Set([
      ...STANDARD_THEMES,
      ...(profile.ideologiesWhitelist || [])
    ]));

    return (
      <div className="min-h-screen bg-[#fdfcf0] py-10 px-6 font-sans relative flex flex-col items-center">
        <button onClick={onExit} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] rounded-full shadow-sm hover:bg-[#f9f8f2] flex items-center gap-2 text-[#7a8d7d] font-bold text-sm cursor-pointer z-10">
          <Home className="w-5 h-5"/> Switch Profile
        </button>

        <div className="max-w-4xl w-full flex flex-col gap-10 mt-8">
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#3d3a2e] flex items-center justify-center gap-3">
              <Sparkles className="w-10 h-10 text-[#c9b7a2]" />
              Welcome back, {profile.name}!
              <Sparkles className="w-10 h-10 text-[#c9b7a2]" />
            </h1>
            <p className="text-[#8c887a] mt-2 font-medium">Create a new story or resume reading below!</p>
          </div>

          {/* Consolidated Customizer Panel */}
          <div className="bg-white rounded-[40px] shadow-sm border border-[#e8e4d9] p-8 md:p-12 z-10">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#3d3a2e] mb-8 text-center flex items-center justify-center gap-2 select-none">
              Create New Story Magic
            </h2>

            {/* Genre selection */}
            <div className="mb-8">
              <label className="text-sm font-bold text-[#7c786a] uppercase tracking-wider block mb-3 select-none">Choose a Genre</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
                {STANDARD_GENRES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGenre(g);
                      setCustomGenre('');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer truncate ${
                      genre === g && !customGenre
                        ? 'bg-[#7a8d7d] border-[#7a8d7d] text-white shadow-sm'
                        : 'bg-[#fdfcf0] border-[#e8e4d9] text-[#5a5646] hover:border-[#7a8d7d]'
                    }`}
                    title={g}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or write a custom genre..."
                value={customGenre}
                onChange={e => {
                  setCustomGenre(e.target.value);
                  setGenre(null);
                }}
                className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646]"
              />
            </div>

            {/* Themes selection */}
            <div className="mb-8">
              <label className="text-sm font-bold text-[#7c786a] uppercase tracking-wider block mb-3 select-none">Include Themes</label>
              <div className="flex flex-wrap gap-2.5 mb-4">
                {combinedThemes.map(t => {
                  const isSelected = selectedThemes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedThemes(prev => prev.filter(item => item !== t));
                        } else {
                          setSelectedThemes(prev => [...prev, t]);
                        }
                      }}
                      className={`py-2 px-4 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#c9b7a2] border-[#c9b7a2] text-white shadow-sm'
                          : 'bg-[#f9f8f2] border-[#e8e4d9] text-[#5a5646] hover:border-[#c9b7a2]'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Type a custom theme (optional)..."
                value={customTheme}
                onChange={e => setCustomTheme(e.target.value)}
                className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646]"
              />
            </div>

            {/* Language Selection */}
            <div className="mb-8 border-t border-[#f0eee4] pt-8">
              <label className="text-sm font-bold text-[#7c786a] uppercase tracking-wider block mb-3 select-none">Language Options</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-[#9a9483] uppercase block mb-2 select-none">Primary Story Language</label>
                  <select
                    value={primaryLang}
                    onChange={e => {
                      setPrimaryLang(e.target.value);
                      if (supportLang === e.target.value) setSupportLang('');
                    }}
                    className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646] font-bold cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 select-none">
                    <label className="text-xs font-bold text-[#9a9483] uppercase block">Dual Language Mode</label>
                    <input
                      type="checkbox"
                      checked={isDualLanguage}
                      onChange={e => {
                        setIsDualLanguage(e.target.checked);
                        if (!e.target.checked) setSupportLang('');
                        else if (!supportLang) setSupportLang('English');
                      }}
                      className="w-4 h-4 text-[#7a8d7d] border-[#e8e4d9] rounded focus:ring-[#7a8d7d] cursor-pointer"
                    />
                  </div>
                  <select
                    value={supportLang}
                    onChange={e => setSupportLang(e.target.value)}
                    disabled={!isDualLanguage}
                    className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646] font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="" disabled={isDualLanguage}>Select translation language...</option>
                    {LANGUAGES.filter(lang => lang !== primaryLang).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Story mode */}
            <div className="mb-10 border-t border-[#f0eee4] pt-8">
              <label className="text-sm font-bold text-[#7c786a] uppercase tracking-wider block mb-3 select-none">Story Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('guide')}
                  className={`p-5 rounded-2xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    mode === 'guide'
                      ? 'bg-[#7a8d7d] border-[#7a8d7d] text-white shadow-sm'
                      : 'bg-[#fdfcf0] border-[#e8e4d9] text-[#5a5646] hover:border-[#7a8d7d]'
                  }`}
                >
                  <span className="text-3xl mb-2">✍️</span>
                  <span className="font-bold text-sm">Guide the Story</span>
                  <span className={`text-[10px] mt-1 ${mode === 'guide' ? 'text-white/80' : 'text-[#9a9483]'}`}>Decide what happens next</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('read')}
                  className={`p-5 rounded-2xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                    mode === 'read'
                      ? 'bg-[#c9b7a2] border-[#c9b7a2] text-white shadow-sm'
                      : 'bg-[#fdfcf0] border-[#e8e4d9] text-[#5a5646] hover:border-[#c9b7a2]'
                  }`}
                >
                  <span className="text-3xl mb-2">📖</span>
                  <span className="font-bold text-sm">Sit Back & Read</span>
                  <span className={`text-[10px] mt-1 ${mode === 'read' ? 'text-white/80' : 'text-[#9a9483]'}`}>Enjoy an automated story</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartAdventure}
              disabled={(!genre && !customGenre) || !mode}
              className="w-full bg-[#7a8d7d] hover:bg-[#5a5646] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors text-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              Start the Magic! ✨
            </button>
          </div>

          {/* Bookmarks (In Progress) */}
          {savedBooks.filter(b => b.status === 'in-progress').length > 0 && (() => {
            const filteredBookmarks = savedBooks.filter(
              b => b.status === 'in-progress' &&
              (b.title.toLowerCase().includes(bookmarkSearch.toLowerCase()) ||
               b.genre.toLowerCase().includes(bookmarkSearch.toLowerCase()))
            );
            return (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 select-none">
                  <h3 className="text-2xl font-serif font-bold text-[#5a5646] flex items-center gap-2">
                    ⏳ Books in Progress (Bookmarks)
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9a9483]">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search bookmarks..."
                        value={bookmarkSearch}
                        onChange={e => setBookmarkSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 border border-[#e8e4d9] bg-white rounded-xl text-xs focus:border-[#7a8d7d] outline-none text-[#5a5646] placeholder:text-[#9a9483] font-medium shadow-sm"
                      />
                      {bookmarkSearch && (
                        <button 
                          onClick={() => setBookmarkSearch('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9a9483] hover:text-[#5a5646] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* View Toggle Buttons */}
                    <div className="flex bg-[#e8e4d9]/55 p-1 rounded-xl border border-[#e8e4d9]">
                      <button
                        onClick={() => setBookmarkView('grid')}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          bookmarkView === 'grid'
                            ? 'bg-white text-[#5a5646] shadow-sm'
                            : 'text-[#9a9483] hover:text-[#5a5646]'
                        }`}
                        title="Grid View"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setBookmarkView('list')}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          bookmarkView === 'list'
                            ? 'bg-white text-[#5a5646] shadow-sm'
                            : 'text-[#9a9483] hover:text-[#5a5646]'
                        }`}
                        title="List View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredBookmarks.length === 0 ? (
                  <div className="text-center py-10 text-[#9a9483] bg-white rounded-[24px] border border-dashed border-[#dcd8cc] text-sm font-medium italic select-none">
                    No bookmarks match "{bookmarkSearch}".
                  </div>
                ) : bookmarkView === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredBookmarks.map(book => (
                      <div 
                        key={book.id} 
                        onClick={() => handleOpenBook(book)}
                        className="bg-white border border-[#e8e4d9] rounded-[24px] p-6 shadow-sm hover:border-[#7a8d7d] hover:-translate-y-1 transition-all cursor-pointer flex flex-col relative overflow-hidden group"
                      >
                        <div className="h-32 bg-[#f9f8f2] rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                          {book.pages[book.pages.length - 1]?.imageUrl && book.pages[book.pages.length - 1].imageUrl !== 'LOADING' ? (
                            <img src={book.pages[book.pages.length - 1].imageUrl} alt="Book cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <span className="text-4xl text-[#7a8d7d] animate-pulse">✨</span>
                          )}
                          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                            Page {book.lastReadPageIndex + 1}
                          </div>
                        </div>
                        <h4 className="font-bold text-[#4a4636] text-lg mb-1 truncate">{book.title}</h4>
                        <p className="text-xs text-[#9a9483] font-bold uppercase tracking-wider mb-3">
                          {book.genre} • Page {book.pages.length} of {MAX_PAGES}
                        </p>
                        <div className="w-full bg-[#e8e4d9] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#7a8d7d] h-full" style={{ width: `${(book.pages.length / MAX_PAGES) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredBookmarks.map(book => (
                      <div
                        key={book.id}
                        onClick={() => handleOpenBook(book)}
                        className="bg-white border border-[#e8e4d9] rounded-[24px] p-4 shadow-sm hover:border-[#7a8d7d] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-4 group"
                      >
                        <div className="w-16 h-16 bg-[#f9f8f2] rounded-xl flex items-center justify-center overflow-hidden relative flex-shrink-0">
                          {book.pages[book.pages.length - 1]?.imageUrl && book.pages[book.pages.length - 1].imageUrl !== 'LOADING' ? (
                            <img src={book.pages[book.pages.length - 1].imageUrl} alt="Book cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <span className="text-2xl text-[#7a8d7d] animate-pulse">✨</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-[#4a4636] text-base mb-0.5 truncate">{book.title}</h4>
                            <p className="text-xs text-[#9a9483] font-bold uppercase tracking-wider">
                              {book.genre} • Page {book.pages.length} of {MAX_PAGES}
                            </p>
                          </div>

                          <div className="w-full sm:w-48 flex items-center gap-3">
                            <div className="flex-1 bg-[#e8e4d9] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#7a8d7d] h-full" style={{ width: `${(book.pages.length / MAX_PAGES) * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-[#9a9483] uppercase flex-shrink-0">
                              {Math.round((book.pages.length / MAX_PAGES) * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-2">
                          <span className="hidden md:inline-block bg-[#fdfcf0] border border-[#e8e4d9] text-[#7a8d7d] text-xs font-bold px-3 py-1.5 rounded-xl">
                            Page {book.lastReadPageIndex + 1}
                          </span>
                          <span className="text-xl group-hover:translate-x-1 transition-transform select-none">📖</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Saved Completed Library */}
          {savedBooks.filter(b => b.status === 'completed').length > 0 && (
            <div>
              <h3 className="text-2xl font-serif font-bold text-[#5a5646] mb-6 flex items-center gap-2 select-none">
                📚 Completed Library
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {savedBooks.filter(b => b.status === 'completed').map(book => (
                  <div 
                    key={book.id} 
                    onClick={() => handleOpenBook(book)}
                    className="bg-white border border-[#e8e4d9] rounded-[24px] p-6 shadow-sm hover:border-[#c9b7a2] hover:-translate-y-1 transition-all cursor-pointer flex flex-col relative overflow-hidden group"
                  >
                    <div className="h-32 bg-[#f9f8f2] rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                      {book.pages[0]?.imageUrl && book.pages[0].imageUrl !== 'LOADING' ? (
                        <img src={book.pages[0].imageUrl} alt="Book cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <span className="text-4xl">📖</span>
                      )}
                    </div>
                    <h4 className="font-bold text-[#4a4636] text-lg mb-1 truncate">{book.title}</h4>
                    <p className="text-xs text-[#9a9483] font-bold uppercase tracking-wider">
                      {book.genre} • {book.pages.length} Pages
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // 2. READING & GENERATION INTERFACE
  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center py-10 px-4 md:px-12 font-sans relative">
      <button onClick={handleExitBook} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] shadow-sm rounded-2xl hover:bg-[#f9f8f2] flex items-center gap-2 z-10 text-[#7a8d7d] font-bold text-sm cursor-pointer">
         <ArrowLeft className="w-5 h-5"/> Exit Book
      </button>

      {pages.length === 0 && isGeneratingText ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCcw className="w-16 h-16 text-[#7a8d7d] animate-spin mb-6" />
          <h2 className="text-3xl font-serif font-bold text-[#5a5646]">Brewing up some magic...</h2>
        </div>
      ) : (
        currentPage && (
          <div className="max-w-5xl w-full bg-white rounded-[48px] shadow-sm border border-[#e8e4d9] overflow-hidden flex flex-col mt-8 relative">
            <div className="flex-1 min-h-[40vh] md:min-h-[45vh] bg-[#f9f8f2] border-b border-[#f0eee4] flex items-center justify-center relative">
               
               {/* Illustration card - Async Loading State */}
               {currentPage.imageUrl === 'LOADING' ? (
                 <div className="w-full h-full min-h-[40vh] md:min-h-[45vh] bg-[#f0eee4] flex flex-col items-center justify-center relative animate-pulse">
                    <RefreshCcw className="w-12 h-12 text-[#7a8d7d] animate-spin mb-4" />
                    <p className="text-sm font-bold text-[#8c887a] font-serif">Painting page illustration...</p>
                 </div>
               ) : (
                 <img src={currentPage.imageUrl} alt="Story illustration" className="w-full h-full object-cover max-h-[60vh] object-center mix-blend-multiply" referrerPolicy="no-referrer" />
               )}

               <div className="absolute top-6 right-6 bg-[#fdfcf0] px-4 py-2 rounded-2xl font-bold text-[#7a8d7d] shadow-sm border border-[#e8e4d9] text-sm tracking-wide select-none">
                 Page {currentPageIndex + 1} of {MAX_PAGES}
               </div>
               
               {/* Previous Page flip button */}
               {currentPageIndex > 0 && (
                 <button 
                   onClick={handlePrevPage}
                   className="absolute left-6 p-4 bg-white/80 hover:bg-white border border-[#e8e4d9] rounded-full shadow-sm hover:scale-105 transition-all text-[#5a5646] cursor-pointer"
                   title="Previous Page"
                 >
                   <ArrowLeft className="w-6 h-6" />
                 </button>
               )}
            </div>
            
            {/* Story text container with Selection support */}
            <div 
              className="p-8 md:p-12 flex flex-col selection:bg-amber-100"
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
            >
              <p className="text-2xl md:text-3xl lg:text-4xl text-[#5a5646] font-serif leading-relaxed mb-4">
                {currentPage.text}
              </p>

              {/* Render translated text if dual-language active */}
              {currentPage.translationText && (
                <p className="text-lg md:text-xl text-[#8c887a] font-serif italic leading-relaxed border-t border-[#f0eee4] pt-4 mb-4">
                  {currentPage.translationText}
                </p>
              )}

              {imageUnavailable && (
                <div className="bg-[#fcf8f0] border border-[#ebd9c1] rounded-[24px] p-6 mb-8 flex flex-col md:flex-row items-center md:items-start gap-4 select-none">
                  <span className="text-3xl select-none">✨</span>
                  <div>
                    <h5 className="font-bold text-[#5a5646] text-sm">Parent Note: Illustrations Unavailable</h5>
                    <p className="text-xs text-[#8c887a] mt-1 leading-relaxed">
                      We are showing a placeholder illustration because the configured image provider is currently unavailable. Add or switch an image-capable API key (OpenAI, Gemini) in storymagic.config.json to enable live drawings.
                    </p>
                  </div>
                </div>
              )}
              
              {/* If NOT completed and we are on the LAST generated page */}
              {!isGeneratingText && !isDone && currentPageIndex === pages.length - 1 && !isBookReadOnly && (
                mode === 'guide' ? (
                  <div className="mt-4 flex flex-col gap-4">
                    <label className="text-sm font-bold text-[#9a9483] uppercase tracking-tighter block mb-1 select-none">
                      What should happen next?
                    </label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Type your ideas here..." 
                        className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] p-4 rounded-2xl text-lg focus:border-[#7a8d7d] focus:outline-none text-[#4a4636]"
                        onKeyDown={e => e.key === 'Enter' && handleNextPage()}
                      />
                      <button 
                        onClick={handleNextPage}
                        className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white p-4 rounded-2xl flex items-center justify-center shadow-sm transition-transform hover:-translate-y-1 cursor-pointer"
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <button 
                      onClick={handleNextPage}
                      className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white px-8 py-4 rounded-2xl text-xl font-bold flex items-center justify-center shadow-sm transition-colors w-full cursor-pointer"
                    >
                      Turn the Page <Sparkles className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                )
              )}

              {isGeneratingText && (
                 <div className="mt-8 flex items-center gap-4 text-[#7a8d7d] text-xl font-bold font-serif select-none">
                   <RefreshCcw className="w-6 h-6 animate-spin" />
                   Writing the next page...
                 </div>
              )}

              {/* Next Page button if we are reading history pages */}
              {currentPageIndex < pages.length - 1 && (
                 <div className="mt-8">
                   <button 
                     onClick={handlePageClickNext}
                     className="bg-[#fdfcf0] hover:bg-[#7a8d7d] hover:text-white border border-[#e8e4d9] text-[#5a5646] px-8 py-4 rounded-2xl text-xl font-bold flex items-center justify-center shadow-sm transition-colors w-full cursor-pointer"
                   >
                     Next Page <ArrowRight className="w-5 h-5 ml-2" />
                   </button>
                 </div>
              )}

              {/* End of book flows */}
              {isDone && currentPageIndex === pages.length - 1 && !isGeneratingText && (
                <div className="mt-12 flex flex-col items-center border-t border-[#e8e4d9] pt-10">
                  <h3 className="text-4xl font-serif font-bold text-[#3d3a2e] mb-4 text-center select-none">The End!</h3>
                  
                  {isBookReadOnly ? (
                    <button 
                      onClick={handleExitBook}
                      className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white px-10 py-5 rounded-full text-xl font-bold flex items-center justify-center shadow-sm transition-all transform hover:-translate-y-1 w-full max-w-md cursor-pointer"
                    >
                      Back to Library
                    </button>
                  ) : (
                    <>
                      <p className="text-lg text-[#8c887a] mb-8 text-center max-w-2xl select-none">
                        What an amazing adventure! Would you like to keep this book in your library to read again later?
                      </p>
                      <button 
                        onClick={handleSave}
                        className="bg-[#c9b7a2] hover:bg-[#b09e89] text-white px-10 py-5 rounded-full text-xl font-bold flex items-center justify-center shadow-sm transition-all transform hover:-translate-y-1 w-full max-w-md cursor-pointer"
                      >
                        <Save className="w-6 h-6 ml-2 mr-4" /> Save Book!
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* FLOATING LOOKUP TRIGGER PILL */}
      {selectedText && !showLookupCard && (
        <button
          onClick={handleTriggerLookup}
          style={{
            position: 'absolute',
            left: `${lookupCoords?.x || window.innerWidth / 2}px`,
            top: `${(lookupCoords?.y || 200) - 45}px`,
            transform: 'translateX(-50%)',
          }}
          className="z-40 bg-[#7a8d7d] hover:bg-[#5a5646] text-white px-4 py-2 rounded-full font-bold text-xs shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 border border-[#e8e4d9]"
        >
          <span>🔍 Lookup Selection</span>
        </button>
      )}

      {/* DICTIONARY/TRANSLATION POPUP LOOKUP OVERLAY CARD */}
      {showLookupCard && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-[32px] shadow-2xl max-w-md w-full border border-[#e8e4d9] relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => {
                setShowLookupCard(false);
                setSelectedText('');
              }}
              className="absolute top-4 right-4 text-[#9a9483] hover:text-[#4a4636] p-2 hover:bg-[#fdfcf0] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-bold text-[#9a9483] uppercase tracking-wider mb-1 select-none">Selected Text</h3>
            <h2 className="text-lg font-serif font-bold text-[#4a4636] mb-4 italic break-words">"{selectedText}"</h2>

            {lookupLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCcw className="w-8 h-8 text-[#7a8d7d] animate-spin mb-3" />
                <p className="text-xs font-bold text-[#9a9483]">Searching dictionary...</p>
              </div>
            ) : (
              lookupData && (
                <div className="flex flex-col gap-4">
                  {/* Definition */}
                  <div className="bg-[#fdfcf0] p-4 rounded-2xl border border-[#e8e4d9]">
                    <h4 className="text-[10px] font-bold text-[#7a8d7d] uppercase tracking-wide mb-1.5 select-none">📖 Meaning</h4>
                    <p className="text-sm font-medium text-[#5a5646] leading-relaxed">{lookupData.definition}</p>
                  </div>

                  {/* Synonyms */}
                  {lookupData.synonyms && lookupData.synonyms.length > 0 && (
                    <div className="bg-[#f9f8f2] p-4 rounded-2xl border border-[#f0eee4]">
                      <h4 className="text-[10px] font-bold text-[#c9b7a2] uppercase tracking-wide mb-2 select-none">💡 Similar Words (Thesaurus)</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {lookupData.synonyms.map((syn, idx) => (
                          <span key={idx} className="bg-white px-2.5 py-1 rounded-full text-xs font-bold text-[#5a5646] border border-[#e8e4d9]">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Translation Section */}
                  <div className="border-t border-[#f0eee4] pt-4 mt-2 select-none">
                    <h4 className="text-[10px] font-bold text-[#c9b7a2] uppercase tracking-wide mb-2">🌐 Translate Selection</h4>
                    
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedTargetLang}
                        onChange={e => {
                          const lang = e.target.value;
                          setSelectedTargetLang(lang);
                        }}
                        className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-3 py-2 text-xs focus:border-[#7a8d7d] outline-none text-[#5a5646] font-bold cursor-pointer"
                      >
                        {LANGUAGES.filter(lang => lang !== (activeBook?.primaryLang || primaryLang)).map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleTranslateTo(selectedTargetLang)}
                        disabled={translationLoading}
                        className="bg-[#7a8d7d] hover:bg-[#5a5646] disabled:opacity-60 text-white font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                        title="Translate"
                      >
                        {translationLoading ? (
                          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Languages className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Display Translation */}
                    {translationsCache[selectedTargetLang] && (
                      <div className="bg-[#ebd9c1]/20 p-4 rounded-2xl border border-[#ebd9c1] mt-3">
                        <p className="text-sm font-bold text-[#5a5646] leading-relaxed">{translationsCache[selectedTargetLang]}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

    </div>
  );
}
