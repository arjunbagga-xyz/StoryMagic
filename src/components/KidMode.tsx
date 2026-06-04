import React, { useState, useEffect } from 'react';
import { BookPage, SavedBook, ParentSettings } from '../types';
import { Sparkles, ArrowRight, Save, Home, RefreshCcw } from 'lucide-react';

const GENRES = ['Space Adventure', 'Magic Forest', 'Dinosaurs', 'Underwater World', 'Talking Animals', 'Superhero City'];

export default function KidMode({
  settings,
  onSaveBook,
  onExit,
}: {
  settings: ParentSettings;
  onSaveBook: (book: SavedBook) => void;
  onExit: () => void;
}) {
  const [mode, setMode] = useState<'guide' | 'read' | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [pages, setPages] = useState<BookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [bookLessons, setBookLessons] = useState<string[]>([]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  // Actually the requirements said EXACTLY 50 pages. But 50 is too long for a single session.
  // I will restrict it to 5 for now so it's actually usable by humans trying it out interactively,
  // but if explicitly needed I can change it. Let's make it 5 max for demo purposes, 
  // maybe passing as a prop or keeping it 50 as prompted. The prompt says "conclude in 50 pages".
  // Okay, I'll set it to 50, but let the user end it early manually if they want, or force 50.
  // Let's set it to 5 so testing works without spending 10 minutes on API calls. Wait, the prompt says
  // "The book shall conclude in 50 pages". I will respect the prompt.
  const MAX_PAGES = 50; 

  const generateNextPage = async (kidFeedback: string = '') => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre,
          lessons: settings.lessons,
          ideologiesBlacklist: settings.ideologiesBlacklist,
          ideologiesWhitelist: settings.ideologiesWhitelist,
          currentPage: pages.length,
          maxPages: MAX_PAGES,
          previousPages: pages.map(p => ({ text: p.text, kidFeedback: p.kidFeedback })),
          kidFeedback,
        }),
      });
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.lessonsCovered) {
        setBookLessons(prev => Array.from(new Set([...prev, ...data.lessonsCovered])));
      }

      // Automatically generate image for the new page
      const imgResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: data.imagePrompt }),
      });
      const imgData = await imgResponse.json();

      if (imgData.quotaExceeded) {
        setQuotaExceeded(true);
      }

      const newPage: BookPage = {
        text: data.storyText,
        imageUrl: imgData.imageUrl || 'https://picsum.photos/seed/placeholder/800/600',
        imagePrompt: data.imagePrompt,
        kidFeedback,
      };

      setPages(prev => [...prev, newPage]);
      setIsDone(data.isEnd || pages.length + 1 >= MAX_PAGES);
      setCurrentPageIndex(pages.length);
      setFeedback('');

    } catch (err) {
      console.error(err);
      alert('Uh oh! Something went wrong making your story. Let\'s try again!');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (genre && pages.length === 0 && !isGenerating) {
      generateNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else if (!isDone) {
      generateNextPage(mode === 'guide' ? feedback : '');
    }
  };

  const handleSave = () => {
    const defaultTitle = `My ${genre} Story`;
    const title = prompt('Give your book a super cool title!', defaultTitle) || defaultTitle;
    onSaveBook({
      id: Date.now().toString(),
      title,
      genre: genre || 'Story',
      createdAt: Date.now(),
      pages,
      lessonsCovered: bookLessons,
    });
    onExit();
  };

  if (!mode) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-8 font-sans">
        <button onClick={onExit} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] rounded-full shadow-sm hover:bg-[#f9f8f2] flex items-center gap-2">
           <Home className="w-5 h-5 text-[#7a8d7d]"/>
        </button>
        <div className="max-w-4xl w-full">
          <h1 className="text-5xl font-serif font-bold text-[#3d3a2e] text-center mb-12 flex items-center justify-center gap-4">
            <Sparkles className="w-12 h-12 text-[#c9b7a2]" />
            What do you want to do today?
            <Sparkles className="w-12 h-12 text-[#c9b7a2]" />
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <button
              onClick={() => setMode('guide')}
              className="bg-white hover:bg-[#7a8d7d] hover:text-white shadow-sm rounded-[32px] p-10 text-center transition-all transform hover:-translate-y-2 border border-[#e8e4d9] group flex flex-col items-center"
            >
               <span className="text-6xl mb-6 block group-hover:scale-110 transition-transform">✍️</span>
               <h2 className="text-3xl font-bold text-[#5a5646] group-hover:text-white mb-2">Guide the Story</h2>
               <p className="text-[#9a9483] group-hover:text-[#e8e4d9] font-medium text-lg">You decide what happens next!</p>
            </button>
            <button
              onClick={() => setMode('read')}
              className="bg-white hover:bg-[#c9b7a2] hover:text-white shadow-sm rounded-[32px] p-10 text-center transition-all transform hover:-translate-y-2 border border-[#e8e4d9] group flex flex-col items-center"
            >
               <span className="text-6xl mb-6 block group-hover:scale-110 transition-transform">📖</span>
               <h2 className="text-3xl font-bold text-[#5a5646] group-hover:text-white mb-2">Read a Story</h2>
               <p className="text-[#9a9483] group-hover:text-[#fdfcf0] font-medium text-lg">Sit back and enjoy the adventure!</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!genre) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-8 font-sans">
        <button onClick={() => setMode(null)} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] rounded-full shadow-sm hover:bg-[#f9f8f2] flex items-center gap-2">
           <Home className="w-5 h-5 text-[#7a8d7d]"/> Back
        </button>
        <div className="max-w-4xl w-full">
          <h1 className="text-5xl font-serif font-bold text-[#3d3a2e] text-center mb-12 flex items-center justify-center gap-4">
            <Sparkles className="w-12 h-12 text-[#c9b7a2]" />
            What kind of story do you want to hear?
            <Sparkles className="w-12 h-12 text-[#c9b7a2]" />
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className="bg-white hover:bg-[#7a8d7d] hover:text-white shadow-sm rounded-[32px] p-8 text-2xl font-bold text-[#5a5646] transition-all transform hover:-translate-y-2 border border-[#e8e4d9]"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center py-10 px-4 md:px-12 font-sans relative">
      <button onClick={() => {
        onExit();
      }} className="absolute top-4 left-4 p-3 bg-white border border-[#e8e4d9] shadow-sm rounded-2xl hover:bg-[#f9f8f2] flex items-center gap-2 z-10 text-[#7a8d7d]">
         <Home className="w-5 h-5"/>
      </button>

      {pages.length === 0 && isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCcw className="w-16 h-16 text-[#7a8d7d] animate-spin mb-6" />
          <h2 className="text-3xl font-serif font-bold text-[#5a5646]">Brewing up some magic...</h2>
        </div>
      ) : (
        currentPage && (
          <div className="max-w-5xl w-full bg-white rounded-[48px] shadow-sm border border-[#e8e4d9] overflow-hidden flex flex-col">
            <div className="flex-1 min-h-[40vh] md:min-h-[45vh] bg-[#f9f8f2] border-b border-[#f0eee4] flex items-center justify-center relative">
               {/* Illustration */}
               <img src={currentPage.imageUrl} alt="Story illustration" className="w-full h-full object-cover max-h-[60vh] object-center mix-blend-multiply" referrerPolicy="no-referrer" />
               <div className="absolute top-6 right-6 bg-[#fdfcf0] px-4 py-2 rounded-2xl font-bold text-[#7a8d7d] shadow-sm border border-[#e8e4d9] text-sm tracking-wide">
                 Page {currentPageIndex + 1} of {MAX_PAGES}
               </div>
            </div>
            
            <div className="p-8 md:p-12 flex flex-col">
              <p className="text-2xl md:text-3xl lg:text-4xl text-[#5a5646] font-serif leading-relaxed mb-8">
                {currentPage.text}
              </p>

              {quotaExceeded && (
                <div className="bg-[#fcf8f0] border border-[#ebd9c1] rounded-[24px] p-6 mb-8 flex flex-col md:flex-row items-center md:items-start gap-4">
                  <span className="text-3xl select-none">✨</span>
                  <div>
                    <h5 className="font-bold text-[#5a5646] text-sm">Parent Note: Story Magic in Preview Mode</h5>
                    <p className="text-xs text-[#8c887a] mt-1 leading-relaxed">
                      We are displaying our custom Storybook Sketches because of preview tier limitations. Parents can use their own Paid Tier API Key in the <strong>Settings</strong> panel to enjoy high fidelity real-time drawings.
                    </p>
                  </div>
                </div>
              )}
              
              {!isGenerating && !isDone && currentPageIndex === pages.length - 1 && (
                mode === 'guide' ? (
                  <div className="mt-4 flex flex-col gap-4">
                    <label className="text-sm font-bold text-[#9a9483] uppercase tracking-tighter block mb-1">
                      What should happen next? (Optional)
                    </label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Type your ideas here..." 
                        className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] p-4 rounded-2xl text-lg focus:border-[#7a8d7d] focus:outline-none text-[#4a4636]"
                      />
                      <button 
                        onClick={handleNextPage}
                        className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white p-4 rounded-2xl flex items-center justify-center shadow-sm transition-transform hover:-translate-y-1"
                      >
                        <ArrowRight className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <button 
                      onClick={handleNextPage}
                      className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white px-8 py-4 rounded-2xl text-xl font-bold flex items-center justify-center shadow-sm transition-colors w-full"
                    >
                      Turn the Page <Sparkles className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                )
              )}

              {isGenerating && (
                 <div className="mt-8 flex items-center gap-4 text-[#7a8d7d] text-xl font-bold font-serif">
                   <RefreshCcw className="w-6 h-6 animate-spin" />
                   Turning the page...
                 </div>
              )}

              {currentPageIndex < pages.length - 1 && (
                 <div className="mt-8">
                   <button 
                     onClick={() => handleNextPage()}
                     className="bg-[#fdfcf0] hover:bg-[#7a8d7d] hover:text-white border border-[#e8e4d9] text-[#5a5646] px-8 py-4 rounded-2xl text-xl font-bold flex items-center justify-center shadow-sm transition-colors w-full"
                   >
                     Next Page <ArrowRight className="w-5 h-5 ml-2" />
                   </button>
                 </div>
              )}

              {isDone && currentPageIndex === pages.length - 1 && !isGenerating && (
                <div className="mt-12 flex flex-col items-center border-t border-[#e8e4d9] pt-10 mt-8">
                  <h3 className="text-4xl font-serif font-bold text-[#3d3a2e] mb-4 text-center">The End!</h3>
                  <p className="text-lg text-[#8c887a] mb-8 text-center max-w-2xl">
                    What an amazing adventure! Would you like to keep this book in your library to read again later?
                  </p>
                  <button 
                    onClick={handleSave}
                    className="bg-[#c9b7a2] hover:bg-[#b09e89] text-white px-10 py-5 rounded-full text-xl font-bold flex items-center justify-center shadow-sm transition-all transform hover:-translate-y-1 w-full max-w-md"
                  >
                    <Save className="w-6 h-6 ml-2 mr-4" /> Save Book!
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
