import React, { useEffect, useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Key, 
  Shield, 
  Search, 
  Copy, 
  Check, 
  RefreshCw, 
  Database,
  SearchCode,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { DecryptedVaultEntry } from '../types';

export function Popup() {
  // Session / Authentication state
  const [address, setAddress] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [entries, setEntries] = useState<DecryptedVaultEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local form / UX states
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState(false);

  // Clipboard secure purge states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'user' | 'pass' | null>(null);
  const [clipboardTimer, setClipboardTimer] = useState<number | null>(null);

  /**
   * Sync popup state with background service worker on mount
   */
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = () => {
    chrome.runtime.sendMessage({ type: 'GET_VAULT_STATUS' }, (response) => {
      if (response && response.success) {
        setAddress(response.data.address);
        setIsUnlocked(response.data.isUnlocked);
        if (response.data.address && !response.data.isUnlocked) {
          setSyncWarning(false);
        } else if (!response.data.address) {
          setSyncWarning(true);
        }
        
        if (response.data.isUnlocked) {
          loadEntries();
        }
      }
    });
  };

  const loadEntries = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'GET_ENTRIES' }, (response) => {
      setIsLoading(false);
      if (response && response.success) {
        setEntries(response.data);
      } else {
        setError(response?.error || 'Failed to fetch entries.');
      }
    });
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;

    setIsLoading(true);
    setError(null);

    chrome.runtime.sendMessage({
      type: 'UNLOCK_VAULT',
      payload: { masterPassword }
    }, (response) => {
      setIsLoading(false);
      setMasterPassword(''); // instant purge
      if (response && response.success) {
        setIsUnlocked(true);
        loadEntries();
      } else {
        setError(response?.error || 'Invalid password or unlock error.');
      }
    });
  };

  const handleLock = () => {
    chrome.runtime.sendMessage({ type: 'LOCK_VAULT' }, (response) => {
      if (response && response.success) {
        setIsUnlocked(false);
        setEntries([]);
        setSearchQuery('');
        setError(null);
      }
    });
  };

  /**
   * Secure Clipboard Purge Manager (30s)
   */
  const handleCopyToClipboard = (text: string, entryId: string, type: 'user' | 'pass') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(entryId);
      setCopiedType(type);
      setClipboardTimer(30);

      // Clear any existing timer
      if (window.clipboardInterval) {
        clearInterval(window.clipboardInterval);
      }

      // Start countdown
      const interval = setInterval(() => {
        setClipboardTimer((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            navigator.clipboard.writeText(''); // Clear clipboard
            setCopiedId(null);
            setCopiedType(null);
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

      window.clipboardInterval = interval;
    });
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (window.clipboardInterval) {
        clearInterval(window.clipboardInterval);
      }
    };
  }, []);

  /**
   * Triggers autofill in the active browser tab
   */
  const handleAutofillActiveTab = (entryId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'FILL_ACTIVE_TAB',
          entryId
        }, (response) => {
          if (response && response.success) {
            window.close(); // Close extension popup on successful autofill
          } else {
            setError(response?.error || 'Autofill is only active on form input fields.');
          }
        });
      }
    });
  };

  // Filter entries locally based on searchQuery
  const filteredEntries = entries.filter(e => 
    e.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex flex-col h-full bg-[#090D16] text-slate-100 select-none">
      
      {/* Background ambient gold aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[250px] w-[250px] rounded-full bg-[#D4AF37]/5 blur-[60px]" />

      {/* Extension Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/10 bg-[#090D16]/85 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
          <span className="font-sans font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-gold text-lg">
            SPHYNX
          </span>
        </div>
        
        {isUnlocked && (
          <button 
            onClick={handleLock}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15 transition-all"
          >
            <Lock className="h-3 w-3" />
            Lock Vault
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-5 z-10">
        
        {/* Sync Warning State (Web site is locked/disconnected) */}
        {syncWarning && (
          <div className="rounded-xl border border-gold/10 bg-gold/5 p-4 text-center leading-relaxed">
            <AlertTriangle className="h-6 w-6 text-gold mx-auto mb-2 animate-bounce" />
            <h3 className="text-xs font-bold text-gold uppercase tracking-wider mb-1">Session Not Synced</h3>
            <p className="text-[11px] text-slate-400">
              Sphynx is disconnected. Connect MetaMask and unlock your vault on the dashboard first.
            </p>
            <a 
              href="http://localhost:3000" 
              target="_blank" 
              rel="noreferrer"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-[#05070B] text-xs font-bold transition-all shadow-[0_0_12px_rgba(212,175,55,0.35)]"
            >
              Open Sphynx Website
            </a>
          </div>
        )}

        {/* LOCKED STATE - Input Master Password */}
        {!syncWarning && !isUnlocked && (
          <div className="flex flex-col h-full justify-center py-4">
            <div className="text-center mb-6">
              <div className="inline-flex rounded-xl bg-gold/5 p-3 border border-[#D4AF37]/20 mb-3 shadow-[inset_0_0_12px_rgba(212,175,55,0.05)]">
                <Lock className="h-6 w-6 text-gold" />
              </div>
              <h2 className="text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Unlock Sanctuary</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                Derive AES-256-GCM credentials key for wallet:
              </p>
              <span className="font-mono text-[10px] text-gold mt-1.5 block truncate max-w-[260px] mx-auto bg-gold/5 px-2.5 py-1 rounded-md border border-[#D4AF37]/10">
                {address}
              </span>
            </div>

            <form onSubmit={handleUnlock} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 text-red-400 text-xs font-medium leading-relaxed">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter master password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="glow-input w-full rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-gold text-[#05070B] text-xs font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Key className="h-3.5 w-3.5" />
                    Derive Keys & Access
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* UNLOCKED STATE - Search & Credential Cards */}
        {isUnlocked && (
          <div className="flex flex-col gap-4">
            
            {/* Search inputs */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-white placeholder-white/20 focus:outline-none glow-input"
              />
            </div>

            {/* Error notifications */}
            {error && (
              <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-2 text-red-400 text-[10px]">
                {error}
              </div>
            )}

            {/* Clipboard timers */}
            {clipboardTimer !== null && (
              <div className="rounded-lg border border-gold/10 bg-[#090D16]/50 p-2.5 text-[11px] leading-none flex items-center justify-between select-none">
                <span className="text-slate-400">Clipboard Purge Timer:</span>
                <span className="font-mono text-gold font-bold">{clipboardTimer}s</span>
              </div>
            )}

            {/* Credentials locker */}
            <div className="flex flex-col gap-3 min-h-[220px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12">
                  <RefreshCw className="h-6 w-6 text-gold animate-spin mb-2" />
                  <span className="text-xs text-slate-400">Decrypting vault...</span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                  <Globe className="h-8 w-8 text-white/5 mb-2" />
                  <span className="text-xs text-slate-400 font-bold">No credentials found</span>
                  <span className="text-[10px] text-white/20 mt-1 max-w-[200px]">
                    Create a secret on the Sphynx site to populate your locker.
                  </span>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div 
                    key={entry.id}
                    className="glassmorphism rounded-xl p-3.5 hover:border-[#D4AF37]/35 transition-all flex flex-col gap-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col truncate max-w-[170px]">
                        <span className="text-xs font-bold text-white truncate">{entry.label}</span>
                        <span className="text-[10px] text-slate-400 truncate">{entry.username || 'no username'}</span>
                      </div>
                      
                      <button
                        onClick={() => handleAutofillActiveTab(entry.id)}
                        className="px-2.5 py-1 rounded bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/25 text-[#D4AF37] text-[10px] font-bold transition-all"
                      >
                        Autofill
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-white/5 pt-2.5">
                      <button
                        onClick={() => handleCopyToClipboard(entry.username, entry.id, 'user')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white text-[10px] font-medium transition-all"
                      >
                        {copiedId === entry.id && copiedType === 'user' ? (
                          <Check className="h-3 w-3 text-gold" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy User
                      </button>

                      <button
                        onClick={() => handleCopyToClipboard(entry.plaintext, entry.id, 'pass')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white text-[10px] font-medium transition-all"
                      >
                        {copiedId === entry.id && copiedType === 'pass' ? (
                          <Check className="h-3 w-3 text-gold" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy Pass
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* Extension Footer status */}
      <footer className="px-5 py-3 border-t border-white/5 bg-[#090D16]/50 flex items-center justify-between text-[10px] text-slate-400 select-none">
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3 text-gold" />
          ZK Isolated Flow
        </span>
        <span className="font-mono text-[9px] opacity-40">v1.0.0</span>
      </footer>

    </div>
  );
}

// Support global object window.clipboardInterval for TypeScript
declare global {
  interface Window {
    clipboardInterval?: any;
  }
}
