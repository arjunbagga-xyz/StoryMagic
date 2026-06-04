import React, { useState } from 'react';
import { ParentSettings, SavedBook, AppState } from '../types';
import { ShieldAlert, BookOpen, Settings, Lock, X, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function ParentMode({
  appState,
  onUpdateSettings,
  onDeleteBook,
  onExit
}: {
  appState: AppState;
  onUpdateSettings: (s: ParentSettings) => void;
  onDeleteBook: (id: string) => void;
  onExit: () => void;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // Local state for editing settings
  const [localSettings, setLocalSettings] = useState<ParentSettings>(appState.settings);

  // Lists management
  const [newWhite, setNewWhite] = useState('');
  const [newBlack, setNewBlack] = useState('');
  const [newLesson, setNewLesson] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === appState.settings.pin) {
      setIsAuthenticated(true);
      setErrorPin(false);
    } else {
      setErrorPin(true);
      setPinInput('');
    }
  };

  const saveSettings = (newSet: ParentSettings) => {
    setLocalSettings(newSet);
    onUpdateSettings(newSet);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#4a4636] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[32px] shadow-lg max-w-md w-full text-center border border-[#e8e4d9]">
          <div className="w-16 h-16 bg-[#e8e4d9] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#7a8d7d]" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-[#3d3a2e] mb-2">Parent Portal</h2>
          <p className="text-[#8c887a] font-medium mb-8">Enter your PIN to manage content settings and view reading stats.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password"
              placeholder="PIN code"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="px-4 py-4 rounded-2xl bg-[#fdfcf0] text-[#4a4636] border border-[#e8e4d9] focus:border-[#7a8d7d] focus:ring-1 focus:ring-[#7a8d7d] text-center text-2xl tracking-[0.5em] font-mono outline-none placeholder:tracking-normal placeholder:text-[#9a9483]"
              autoFocus
            />
            {errorPin && <p className="text-red-500 text-sm font-medium">Incorrect PIN. (Default is 1234)</p>}
            <button type="submit" className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold py-4 rounded-2xl transition-colors mt-2">
              Unlock
            </button>
            <button type="button" onClick={onExit} className="text-[#9a9483] hover:text-[#4a4636] mt-4 text-sm font-bold pb-2 transition-colors">
              Back to Kids Area
            </button>
          </form>
        </div>
      </div>
    );
  }

  const addWhitelist = () => {
    if (!newWhite.trim()) return;
    saveSettings({ ...localSettings, ideologiesWhitelist: [...localSettings.ideologiesWhitelist, newWhite.trim()] });
    setNewWhite('');
  };

  const removeWhitelist = (idx: number) => {
    const list = [...localSettings.ideologiesWhitelist];
    list.splice(idx, 1);
    saveSettings({ ...localSettings, ideologiesWhitelist: list });
  };

  const addBlacklist = () => {
    if (!newBlack.trim()) return;
    saveSettings({ ...localSettings, ideologiesBlacklist: [...localSettings.ideologiesBlacklist, newBlack.trim()] });
    setNewBlack('');
  };

  const removeBlacklist = (idx: number) => {
    const list = [...localSettings.ideologiesBlacklist];
    list.splice(idx, 1);
    saveSettings({ ...localSettings, ideologiesBlacklist: list });
  };

  const addLesson = () => {
    if (!newLesson.trim()) return;
    if (localSettings.lessons.length >= 5) {
      alert("You can only focus on up to 5 lessons at a time.");
      return;
    }
    saveSettings({ ...localSettings, lessons: [...localSettings.lessons, newLesson.trim()] });
    setNewLesson('');
  };

  const removeLesson = (idx: number) => {
    const list = [...localSettings.lessons];
    list.splice(idx, 1);
    saveSettings({ ...localSettings, lessons: list });
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] text-[#4a4636] flex flex-col font-sans">
      <header className="bg-white border-b border-[#e8e4d9] px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#7a8d7d] p-2 rounded-xl text-white">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#5a5646]">Parental Dashboard</h1>
        </div>
        <button onClick={onExit} className="text-[#7c786a] hover:text-[#3d3a2e] flex items-center gap-2 font-medium bg-[#fdfcf0] hover:bg-[#e8e4d9] border border-[#e8e4d9] px-5 py-2 rounded-full transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Settings */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#e8e4d9]">
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-3 text-[#3d3a2e]">
               <div className="p-2 bg-[#fdfcf0] border border-[#e8e4d9] rounded-xl"><ShieldAlert className="w-5 h-5 text-[#c9b7a2]" /></div>
               Ideology & Content Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Whitelist */}
               <div>
                  <h3 className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2">Whitelisted Themes</h3>
                  <p className="text-xs text-[#9a9483] mb-4">Themes the AI should actively include when possible.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      value={newWhite} onChange={e => setNewWhite(e.target.value)}
                      placeholder="e.g. teamwork, sharing..."
                      onKeyDown={e => e.key === 'Enter' && addWhitelist()}
                      className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none"
                    />
                    <button onClick={addWhitelist} className="bg-[#e8e4d9] text-[#5a5646] p-3 rounded-xl hover:bg-[#dcd8cc]"><Plus className="w-5 h-5"/></button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {localSettings.ideologiesWhitelist.map((w, i) => (
                      <li key={i} className="bg-[#f9f8f2] text-[#4a4636] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 border border-[#e8e4d9]">
                        {w} <button onClick={() => removeWhitelist(i)} className="text-[#9a9483] hover:text-red-500"><X className="w-3 h-3" /></button>
                      </li>
                    ))}
                    {localSettings.ideologiesWhitelist.length === 0 && <span className="text-xs text-[#9a9483] italic">No whitelisted themes.</span>}
                  </ul>
               </div>
               
               {/* Blacklist */}
               <div>
                  <h3 className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2">Blacklisted Themes</h3>
                  <p className="text-xs text-[#9a9483] mb-4">Themes the AI must strictly avoid.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      value={newBlack} onChange={e => setNewBlack(e.target.value)}
                      placeholder="e.g. violence, scary monsters..."
                      onKeyDown={e => e.key === 'Enter' && addBlacklist()}
                      className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none"
                    />
                    <button onClick={addBlacklist} className="bg-[#e8e4d9] text-[#5a5646] p-3 rounded-xl hover:bg-[#dcd8cc]"><Plus className="w-5 h-5"/></button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {localSettings.ideologiesBlacklist.map((b, i) => (
                      <li key={i} className="bg-[#4a4636] text-white/90 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 border border-[#4a4636]">
                        {b} <button onClick={() => removeBlacklist(i)} className="text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
                      </li>
                    ))}
                    {localSettings.ideologiesBlacklist.length === 0 && <span className="text-xs text-[#9a9483] italic">No blacklisted themes.</span>}
                  </ul>
               </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-[#e8e4d9]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold flex items-center gap-3 text-[#3d3a2e] mb-2">
                  <div className="p-2 bg-[#fdfcf0] border border-[#e8e4d9] rounded-xl"><BookOpen className="w-5 h-5 text-[#a8b59e]" /></div>
                  Moral & Educational Lessons
                </h2>
                <p className="text-[#8c887a] text-sm">Add up to 5 lessons for the AI to teach naturally.</p>
              </div>
              <span className="bg-[#e8e4d9] border border-[#dcd8cc] text-[#5a5646] text-xs font-bold px-3 py-1 bg-opacity-50 rounded-full">
                {localSettings.lessons.length} / 5 Active
              </span>
            </div>

            <div className="flex gap-3 mb-8 max-w-xl">
              <input 
                type="text" 
                value={newLesson} onChange={e => setNewLesson(e.target.value)}
                placeholder="e.g. Basic Math counting, Importance of telling truth"
                onKeyDown={e => e.key === 'Enter' && addLesson()}
                disabled={localSettings.lessons.length >= 5}
                className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-2xl px-5 py-4 text-sm focus:border-[#7a8d7d] outline-none disabled:opacity-50"
              />
              <button 
                onClick={addLesson} 
                disabled={localSettings.lessons.length >= 5}
                className="bg-[#7a8d7d] text-white font-medium px-6 py-3 rounded-2xl hover:bg-[#5a5646] flex items-center gap-2 border border-[#7a8d7d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <Plus className="w-5 h-5"/> Add
              </button>
            </div>

            <div className="space-y-3">
              {localSettings.lessons.map((lesson, i) => (
                <div key={i} className="flex items-center justify-between bg-[#fdfcf0] border border-[#e8e4d9] rounded-2xl p-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#5a5646]">{lesson}</span>
                    <span className="text-[11px] font-bold text-[#9a9483] mt-2 uppercase tracking-wider">
                      Stories taught: <strong className="text-[#7a8d7d]">{appState.lessonStats[lesson] || 0}</strong>
                    </span>
                  </div>
                  <button onClick={() => removeLesson(i)} className="text-[#9a9483] hover:text-red-500 p-2 bg-white rounded-xl shadow-sm border border-[#e8e4d9]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {localSettings.lessons.length === 0 && (
                <div className="text-center py-10 text-[#9a9483] bg-[#f9f8f2] rounded-3xl border border-dashed border-[#dcd8cc]">
                  <p className="font-medium text-sm">No active lessons configured.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Library */}
        <div className="lg:col-span-1">
           <div className="bg-[#4a4636] p-8 rounded-[40px] shadow-sm text-white/90 sticky top-24">
             <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4 text-white">
               <BookOpen className="w-5 h-5 opacity-70" />
               Saved Library
             </h2>
             
             {appState.savedBooks.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-6 font-medium">Your kids haven't saved any books yet.</p>
             ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {appState.savedBooks.map(book => (
                    <div key={book.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col group relative hover:bg-white/10 transition-colors">
                       <button 
                         className="absolute top-4 right-4 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-black/20 rounded-xl"
                         onClick={(e) => {
                           e.stopPropagation();
                           if(confirm('Are you sure you want to delete this book?')) onDeleteBook(book.id);
                         }}
                         title="Delete book"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                       <h3 className="font-serif font-bold text-white text-lg pr-8">{book.title}</h3>
                       <p className="text-[11px] uppercase tracking-wider text-[#c9b7a2] font-bold mt-2 mb-3">{book.genre} • {book.pages.length} Pages</p>
                       <span className="text-[10px] text-white/40 mt-auto italic">Saved on {new Date(book.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
             )}
           </div>
        </div>

      </main>
    </div>
  );
}
