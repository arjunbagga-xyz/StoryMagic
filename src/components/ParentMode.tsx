import React, { useState } from 'react';
import { ParentSettings, AppState, ChildProfile } from '../types';
import { ShieldAlert, BookOpen, Settings, Lock, X, Plus, Trash2, ArrowLeft, Sliders } from 'lucide-react';

export default function ParentMode({
  appState,
  onUpdateSettings,
  onUpdateProfiles,
  onExit
}: {
  appState: AppState;
  onUpdateSettings: (s: ParentSettings) => void;
  onUpdateProfiles: (p: ChildProfile[]) => void;
  onExit: () => void;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // Profile currently selected for editing content filters
  const [activeEditProfileId, setActiveEditProfileId] = useState<string | null>(() => {
    return appState.profiles && appState.profiles.length > 0 ? appState.profiles[0].id : null;
  });

  // Popup modal visibility
  const [showAddModal, setShowAddModal] = useState(false);

  // Inputs for Whitelists, Blacklists, and Lessons
  const [newWhite, setNewWhite] = useState('');
  const [newBlack, setNewBlack] = useState('');
  const [newLesson, setNewLesson] = useState('');

  // Child profile creation states
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileBirthdate, setNewProfileBirthdate] = useState('');
  const [newProfilePin, setNewProfilePin] = useState('');

  const [tempPin, setTempPin] = useState(appState.settings.pin);

  React.useEffect(() => {
    setTempPin(appState.settings.pin);
  }, [appState.settings.pin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === appState.settings.pin) {
      setIsAuthenticated(true);
      setErrorPin(false);
      // Auto select the first child if not already selected
      if (!activeEditProfileId && appState.profiles && appState.profiles.length > 0) {
        setActiveEditProfileId(appState.profiles[0].id);
      }
    } else {
      setErrorPin(true);
      setPinInput('');
    }
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim() || !newProfileBirthdate || newProfilePin.length !== 4) {
      alert('Please fill out all fields: Name, Birthdate, and a 4-digit PIN.');
      return;
    }
    const newProfileId = Date.now().toString();
    const newProfile: ChildProfile = {
      id: newProfileId,
      name: newProfileName.trim(),
      birthdate: newProfileBirthdate,
      pin: newProfilePin,
      ideologiesWhitelist: ['kindness', 'sharing'],
      ideologiesBlacklist: ['violence', 'swearing'],
      lessons: ['counting from 1 to 10'],
      lessonStats: {}
    };
    onUpdateProfiles([...(appState.profiles || []), newProfile]);
    setActiveEditProfileId(newProfileId); // Auto select new profile
    setNewProfileName('');
    setNewProfileBirthdate('');
    setNewProfilePin('');
    setShowAddModal(false); // Hide popup
  };

  const handleRemoveProfile = (id: string) => {
    if (confirm('Are you sure you want to delete this profile? Saved books linked to this profile will remain, but the profile itself will be removed.')) {
      const remaining = (appState.profiles || []).filter(p => p.id !== id);
      onUpdateProfiles(remaining);
      // Fallback selection to first remaining or null
      if (activeEditProfileId === id) {
        setActiveEditProfileId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const activeProfile = (appState.profiles || []).find(p => p.id === activeEditProfileId);

  const saveProfileSettings = (updatedProf: ChildProfile) => {
    onUpdateProfiles((appState.profiles || []).map(p => p.id === updatedProf.id ? updatedProf : p));
  };

  const addWhitelist = () => {
    if (!activeProfile || !newWhite.trim()) return;
    const currentList = activeProfile.ideologiesWhitelist || [];
    if (currentList.includes(newWhite.trim().toLowerCase())) return;
    
    saveProfileSettings({
      ...activeProfile,
      ideologiesWhitelist: [...currentList, newWhite.trim().toLowerCase()]
    });
    setNewWhite('');
  };

  const removeWhitelist = (idx: number) => {
    if (!activeProfile) return;
    const list = [...(activeProfile.ideologiesWhitelist || [])];
    list.splice(idx, 1);
    saveProfileSettings({
      ...activeProfile,
      ideologiesWhitelist: list
    });
  };

  const addBlacklist = () => {
    if (!activeProfile || !newBlack.trim()) return;
    const currentList = activeProfile.ideologiesBlacklist || [];
    if (currentList.includes(newBlack.trim().toLowerCase())) return;
    
    saveProfileSettings({
      ...activeProfile,
      ideologiesBlacklist: [...currentList, newBlack.trim().toLowerCase()]
    });
    setNewBlack('');
  };

  const removeBlacklist = (idx: number) => {
    if (!activeProfile) return;
    const list = [...(activeProfile.ideologiesBlacklist || [])];
    list.splice(idx, 1);
    saveProfileSettings({
      ...activeProfile,
      ideologiesBlacklist: list
    });
  };

  const addLesson = () => {
    if (!activeProfile || !newLesson.trim()) return;
    const currentList = activeProfile.lessons || [];
    if (currentList.includes(newLesson.trim())) return;
    if (currentList.length >= 5) {
      alert("You can only focus on up to 5 lessons at a time.");
      return;
    }
    
    saveProfileSettings({
      ...activeProfile,
      lessons: [...currentList, newLesson.trim()]
    });
    setNewLesson('');
  };

  const removeLesson = (idx: number) => {
    if (!activeProfile) return;
    const list = [...(activeProfile.lessons || [])];
    list.splice(idx, 1);
    saveProfileSettings({
      ...activeProfile,
      lessons: list
    });
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
        <button onClick={onExit} className="text-[#7c786a] hover:text-[#3d3a2e] flex items-center gap-2 font-medium bg-[#fdfcf0] hover:bg-[#e8e4d9] border border-[#e8e4d9] px-5 py-2 rounded-full transition-colors text-sm cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
      </header>

      {isAuthenticated ? (
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col gap-8">
          
          {/* Row of Reader Tabs + Add Reader Button */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-5 rounded-[24px] border border-[#e8e4d9] shadow-sm z-10">
            <span className="text-xs font-bold text-[#9a9483] uppercase tracking-wider mr-2 select-none">Readers:</span>
            
            {(appState.profiles || []).map(prof => (
              <button
                key={prof.id}
                onClick={() => setActiveEditProfileId(prof.id)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                  activeEditProfileId === prof.id
                    ? 'bg-[#7a8d7d] text-white shadow-sm'
                    : 'bg-[#fdfcf0] border border-[#e8e4d9] text-[#5a5646] hover:border-[#7a8d7d]'
                }`}
              >
                <span>👦</span> {prof.name}
              </button>
            ))}

            <button
              onClick={() => setActiveEditProfileId('__settings__')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeEditProfileId === '__settings__'
                  ? 'bg-[#5a5646] text-white shadow-sm'
                  : 'bg-[#fdfcf0] border border-[#e8e4d9] text-[#5a5646] hover:border-[#5a5646]'
              }`}
            >
              <Settings className="w-4 h-4" /> Change PIN
            </button>
            
            <button
              onClick={() => {
                setNewProfileName('');
                setNewProfileBirthdate('');
                setNewProfilePin('');
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#c9b7a2] hover:bg-[#b09e89] text-white font-bold text-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ml-auto"
            >
              <Plus className="w-4 h-4" /> Add Reader
            </button>
          </div>

          {/* Consolidated SettingsWorkspace */}
          {activeEditProfileId === '__settings__' ? (
            <div className="bg-white rounded-[40px] shadow-sm border border-[#e8e4d9] p-8 md:p-12 flex flex-col gap-8 relative z-10">
              <div className="flex items-center justify-between border-b border-[#f0eee4] pb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#5a5646] p-2.5 rounded-xl text-white">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#4a4636]">Change Parental PIN</h2>
                    <p className="text-xs text-[#9a9483] mt-1 font-semibold">
                      Update the security code used to enter the Parental Dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2 block select-none">
                  New 4-digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={e => setTempPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit PIN"
                  className="border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646] font-mono tracking-widest text-center max-w-[150px]"
                />
              </div>

              <div className="border-t border-[#f0eee4] pt-6 flex justify-end">
                <button
                  onClick={() => {
                    if (tempPin.length !== 4) {
                      alert('PIN must be exactly 4 digits.');
                      return;
                    }
                    onUpdateSettings({ pin: tempPin });
                    alert('Parental PIN updated successfully!');
                  }}
                  className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold px-6 py-3.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Save PIN
                </button>
              </div>
            </div>
          ) : activeProfile ? (
            <div className="bg-white rounded-[40px] shadow-sm border border-[#e8e4d9] p-8 md:p-12 flex flex-col gap-8 relative z-10">
              
              {/* Header inside the workspace card */}
              <div className="flex items-center justify-between border-b border-[#f0eee4] pb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl select-none">👦</span>
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#4a4636]">{activeProfile.name}'s Rules</h2>
                    <p className="text-xs text-[#9a9483] mt-1 font-semibold">
                      Age: {activeProfile.birthdate ? Math.floor((new Date().getTime() - new Date(activeProfile.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 6} • PIN Entry Code: <span className="font-mono bg-[#fdfcf0] border border-[#e8e4d9] px-2 py-0.5 rounded text-[11px] font-bold text-[#7a8d7d]">{activeProfile.pin}</span>
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRemoveProfile(activeProfile.id)}
                  className="text-red-500 hover:text-white hover:bg-red-500 font-bold bg-[#fdfcf0] border border-red-200 px-4 py-2 rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Profile
                </button>
              </div>

              {/* Consolidated Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Column 1: Whitelist & Blacklist */}
                <div className="flex flex-col gap-8">
                  {/* Whitelist */}
                  <div>
                    <h3 className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                      <ShieldAlert className="w-4 h-4 text-[#7a8d7d]" /> Whitelisted Themes
                    </h3>
                    <p className="text-[11px] text-[#9a9483] mb-4">Themes the AI should actively write into the story.</p>
                    
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        value={newWhite} onChange={e => setNewWhite(e.target.value)}
                        placeholder="e.g. sharing, kindness..."
                        onKeyDown={e => e.key === 'Enter' && addWhitelist()}
                        className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-2.5 text-xs focus:border-[#7a8d7d] outline-none"
                      />
                      <button onClick={addWhitelist} className="bg-[#e8e4d9] text-[#5a5646] px-3.5 py-2.5 rounded-xl hover:bg-[#dcd8cc] transition-colors cursor-pointer"><Plus className="w-4 h-4"/></button>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {(activeProfile.ideologiesWhitelist || []).map((w, i) => (
                        <li key={i} className="bg-[#f9f8f2] text-[#4a4636] text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-[#e8e4d9]">
                          {w} <button onClick={() => removeWhitelist(i)} className="text-[#9a9483] hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                        </li>
                      ))}
                      {(activeProfile.ideologiesWhitelist || []).length === 0 && <span className="text-xs text-[#9a9483] italic">No whitelisted themes.</span>}
                    </ul>
                  </div>

                  {/* Blacklist */}
                  <div className="border-t border-[#f0eee4] pt-8">
                    <h3 className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                      <ShieldAlert className="w-4 h-4 text-red-400" /> Blacklisted Themes
                    </h3>
                    <p className="text-[11px] text-[#9a9483] mb-4">Themes the AI must strictly avoid.</p>
                    
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        value={newBlack} onChange={e => setNewBlack(e.target.value)}
                        placeholder="e.g. scary monsters, swearing..."
                        onKeyDown={e => e.key === 'Enter' && addBlacklist()}
                        className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-2.5 text-xs focus:border-[#7a8d7d] outline-none"
                      />
                      <button onClick={addBlacklist} className="bg-[#e8e4d9] text-[#5a5646] px-3.5 py-2.5 rounded-xl hover:bg-[#dcd8cc] transition-colors cursor-pointer"><Plus className="w-4 h-4"/></button>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {(activeProfile.ideologiesBlacklist || []).map((b, i) => (
                        <li key={i} className="bg-[#4a4636] text-white/90 text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-[#4a4636]">
                          {b} <button onClick={() => removeBlacklist(i)} className="text-white/50 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
                        </li>
                      ))}
                      {(activeProfile.ideologiesBlacklist || []).length === 0 && <span className="text-xs text-[#9a9483] italic">No blacklisted themes.</span>}
                    </ul>
                  </div>
                </div>

                {/* Column 2: Lessons */}
                <div>
                  <h3 className="text-sm font-bold text-[#7c786a] uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                    <BookOpen className="w-4 h-4 text-[#a8b59e]" /> Moral & Educational Lessons
                  </h3>
                  <p className="text-[11px] text-[#9a9483] mb-4">Select or type educational concepts for books (up to 5 active).</p>

                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      value={newLesson} onChange={e => setNewLesson(e.target.value)}
                      placeholder="e.g. Basic Math counting, Telling the truth"
                      onKeyDown={e => e.key === 'Enter' && addLesson()}
                      disabled={(activeProfile.lessons || []).length >= 5}
                      className="flex-1 border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-2.5 text-xs focus:border-[#7a8d7d] outline-none disabled:opacity-50"
                    />
                    <button 
                      onClick={addLesson}
                      disabled={(activeProfile.lessons || []).length >= 5}
                      className="bg-[#7a8d7d] text-white font-medium px-4 py-2.5 rounded-xl hover:bg-[#5a5646] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(activeProfile.lessons || []).map((lesson, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#fdfcf0] border border-[#e8e4d9] rounded-2xl p-4 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#5a5646] text-sm">{lesson}</span>
                          <span className="text-[10px] font-bold text-[#9a9483] mt-1.5 uppercase tracking-wide">
                            Completed by {activeProfile.name}: <strong className="text-[#7a8d7d]">{activeProfile.lessonStats?.[lesson] || 0} times</strong>
                          </span>
                        </div>
                        <button onClick={() => removeLesson(i)} className="text-[#9a9483] hover:text-red-500 p-2 bg-white rounded-xl shadow-sm border border-[#e8e4d9] transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(activeProfile.lessons || []).length === 0 && (
                      <div className="text-center py-10 text-[#9a9483] bg-[#f9f8f2] rounded-[24px] border border-dashed border-[#dcd8cc] text-xs font-medium italic">
                        No educational lessons active.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Empty Reader State */
            <div className="bg-white rounded-[40px] shadow-sm border border-[#e8e4d9] p-12 text-center z-10">
              <p className="text-[#8c887a] font-medium leading-relaxed mb-6">No child profiles found. Parents, please create a profile to configure story guidelines!</p>
              <button 
                onClick={() => {
                  setNewProfileName('');
                  setNewProfileBirthdate('');
                  setNewProfilePin('');
                  setShowAddModal(true);
                }} 
                className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold px-6 py-3.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                + Add First Reader
              </button>
            </div>
          )}

        </main>
      ) : (
        /* Parental Gate Login */
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[32px] shadow-lg max-w-md w-full text-center border border-[#e8e4d9]">
            <div className="w-16 h-16 bg-[#e8e4d9] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-[#7a8d7d]" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#3d3a2e] mb-2">Parent Portal</h2>
            <p className="text-[#8c887a] font-medium mb-8">Enter your PIN to manage content settings and child profiles.</p>
            
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
              <button type="submit" className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold py-4 rounded-2xl transition-colors mt-2 cursor-pointer">
                Unlock
              </button>
              <button type="button" onClick={onExit} className="text-[#9a9483] hover:text-[#4a4636] mt-4 text-sm font-bold pb-2 transition-colors cursor-pointer">
                Back to Kids Area
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD READER POPUP MODAL OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full border border-[#e8e4d9] relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-[#9a9483] hover:text-[#4a4636] p-2 hover:bg-[#fdfcf0] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-serif font-bold text-[#3d3a2e] mb-2 text-center">Add Reader Profile</h2>
            <p className="text-[#8c887a] text-xs text-center mb-6 font-medium">Create a new profile with personalized story rules.</p>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#9a9483] uppercase tracking-wider block mb-1">Child's Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Leo" 
                  value={newProfileName} 
                  onChange={e => setNewProfileName(e.target.value)}
                  className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646]"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-[#9a9483] uppercase tracking-wider block mb-1">Birthdate</label>
                <input 
                  type="date" 
                  value={newProfileBirthdate} 
                  onChange={e => setNewProfileBirthdate(e.target.value)}
                  className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-[#5a5646]"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-[#9a9483] uppercase tracking-wider block mb-1">4-digit Code (PIN)</label>
                <input 
                  type="text" 
                  maxLength={4}
                  placeholder="e.g. 1111" 
                  value={newProfilePin} 
                  onChange={e => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-[#e8e4d9] bg-[#fdfcf0] rounded-xl px-4 py-3 text-sm focus:border-[#7a8d7d] outline-none text-center tracking-[0.2em] font-mono text-[#5a5646]"
                />
              </div>
              
              <button 
                onClick={handleAddProfile}
                className="bg-[#7a8d7d] hover:bg-[#5a5646] text-white font-bold py-3.5 rounded-xl transition-colors text-sm cursor-pointer mt-2 shadow-sm"
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
