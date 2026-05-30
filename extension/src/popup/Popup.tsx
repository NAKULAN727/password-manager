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
  Globe,
  AlertTriangle,
  Settings as SettingsIcon,
  Clock,
} from 'lucide-react';
import { DecryptedVaultEntry } from '../types';
import { Settings } from './Settings';
import { toUserError, UserError } from '../lib/errors';

type View = 'main' | 'settings';

export function Popup() {
  const [view, setView] = useState<View>('main');
  const [address, setAddress] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [entries, setEntries] = useState<DecryptedVaultEntry[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userError, setUserError] = useState<UserError | null>(null);
  const [syncWarning, setSyncWarning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'user' | 'pass' | null>(null);
  const [clipboardTimer, setClipboardTimer] = useState<number | null>(null);

  useEffect(() => {
    checkStatus();

    // Listen for session storage changes (e.g., after SYNC_SESSION from web app)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'session') {
        // Session data changed — re-check vault status
        console.log('[Sphynx Popup] Session storage changed, refreshing status');
        checkStatus();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => { chrome.storage.onChanged.removeListener(handleStorageChange); };
  }, []);

  const checkStatus = () => {
    chrome.runtime.sendMessage({ type: 'GET_VAULT_STATUS' }, (response) => {
      console.log('[Sphynx Popup] GET_VAULT_STATUS response:', response);
      if (response?.success) {
        setAddress(response.data.address);
        setIsUnlocked(response.data.isUnlocked);
        setSyncWarning(!response.data.address);
        if (response.data.isUnlocked) loadEntries();
      }
    });
  };

  const loadEntries = () => {
    setIsLoading(true);
    setUserError(null);
    chrome.runtime.sendMessage({ type: 'GET_ENTRIES' }, (response) => {
      setIsLoading(false);
      if (response?.success) {
        setEntries(response.data);
      } else {
        setUserError(toUserError(response?.error || 'Failed to fetch entries.'));
      }
    });
    // Load recent activity
    chrome.runtime.sendMessage({ type: 'GET_RECENT_ACTIVITY' }, (response) => {
      if (response?.success) {
        setRecentIds(response.data.map((r: any) => r.entryId));
      }
    });
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;
    setIsLoading(true);
    setUserError(null);

    chrome.runtime.sendMessage({ type: 'UNLOCK_VAULT', payload: { masterPassword } }, (response) => {
      setIsLoading(false);
      setMasterPassword('');
      if (response?.success) {
        setIsUnlocked(true);
        loadEntries();
      } else {
        setUserError(toUserError(response?.error || 'Unlock failed.'));
      }
    });
  };

  const handleLock = () => {
    chrome.runtime.sendMessage({ type: 'LOCK_VAULT' }, (response) => {
      if (response?.success) {
        setIsUnlocked(false);
        setEntries([]);
        setSearchQuery('');
        setUserError(null);
      }
    });
  };

  const handleRetry = () => {
    setUserError(null);
    if (isUnlocked) loadEntries();
    else checkStatus();
  };

  const handleCopyToClipboard = (text: string, entryId: string, type: 'user' | 'pass') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(entryId);
      setCopiedType(type);
      setClipboardTimer(30);

      if ((window as any).clipboardInterval) clearInterval((window as any).clipboardInterval);

      const interval = setInterval(() => {
        setClipboardTimer((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            navigator.clipboard.writeText('');
            setCopiedId(null);
            setCopiedType(null);
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      (window as any).clipboardInterval = interval;
    });
  };

  useEffect(() => {
    return () => { if ((window as any).clipboardInterval) clearInterval((window as any).clipboardInterval); };
  }, []);

  const handleAutofillActiveTab = (entryId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'FILL_ACTIVE_TAB', entryId }, (response) => {
          if (response?.success) window.close();
          else setUserError(toUserError(response?.error || 'Autofill failed.'));
        });
      }
    });
  };

  // Sort: recent first, then alphabetical
  const sortedEntries = [...entries].sort((a, b) => {
    const aRecent = recentIds.indexOf(a.id);
    const bRecent = recentIds.indexOf(b.id);
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (aRecent === -1 && bRecent !== -1) return 1;
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    return a.label.localeCompare(b.label);
  });

  const filteredEntries = sortedEntries.filter(e =>
    e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Settings view
  if (view === 'settings') {
    return (
      <div className="relative flex flex-col h-full bg-[#0A0806] text-[#F0E6D0] select-none">
        <Settings onBack={() => setView('main')} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#0A0806] text-[#F0E6D0] select-none">

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[250px] w-[250px] rounded-full bg-[#E8A020]/[0.03] blur-[60px]" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#2A1E10] bg-[#141009]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#D4AF37]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.4))' }} />
          <span className="font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#F0E6D0] to-[#E8A020] text-base">
            SPHYNX
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isUnlocked && (
            <>
              <button onClick={() => setView('settings')} className="p-1.5 rounded-lg text-[#9A7D5A] hover:text-[#F0E6D0] hover:bg-[#1E160D] transition-all">
                <SettingsIcon size={14} />
              </button>
              <button onClick={handleLock} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#2A1E10] hover:border-[#E8A020]/30 text-[#E8A020] text-xs font-semibold transition-all">
                <Lock size={11} />
                Lock
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-5 z-10">

        {/* Error Display */}
        {userError && (
          <div className="rounded-xl border border-[#CC4A3A]/20 bg-[#CC4A3A]/5 p-3 mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-[#CC4A3A] shrink-0" />
              <span className="text-[11px] text-[#CC4A3A]">{userError.message}</span>
            </div>
            {userError.action && (
              <button onClick={handleRetry} className="text-[10px] font-bold text-[#E8A020] shrink-0">
                {userError.action}
              </button>
            )}
          </div>
        )}

        {/* Sync Warning */}
        {syncWarning && (
          <div className="rounded-xl border border-[#E8A020]/10 bg-[#E8A020]/5 p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-[#E8A020] mx-auto mb-2" />
            <h3 className="text-xs font-bold text-[#E8A020] uppercase tracking-wider mb-1">Not Connected</h3>
            <p className="text-[11px] text-[#9A7D5A]">Open the Sphynx website and connect your wallet first.</p>
            <a href="http://localhost:3000" target="_blank" rel="noreferrer"
              className="inline-block mt-3 px-4 py-2 rounded-lg bg-gradient-to-br from-[#E8A020] to-[#B86A1A] text-[#0A0806] text-xs font-bold transition-all hover:shadow-[0_4px_15px_rgba(232,160,32,0.3)]">
              Open Sphynx
            </a>
          </div>
        )}

        {/* Locked State */}
        {!syncWarning && !isUnlocked && (
          <div className="flex flex-col h-full justify-center py-4">
            <div className="text-center mb-6">
              <div className="inline-flex rounded-xl bg-[#E8A020]/[0.08] p-3 border border-[#E8A020]/20 mb-3">
                <Lock className="h-6 w-6 text-[#E8A020]" />
              </div>
              <h2 className="text-base font-bold text-[#F0E6D0]">Unlock Vault</h2>
              <span className="font-mono text-[10px] text-[#9A7D5A] mt-1.5 block truncate max-w-[260px] mx-auto bg-[#1E160D] px-2.5 py-1 rounded-md border border-[#2A1E10]">
                {address}
              </span>
            </div>

            <form onSubmit={handleUnlock} className="flex flex-col gap-4">
              <input
                type="password"
                required
                placeholder="Enter master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full rounded-lg border border-[#2A1E10] bg-[#1E160D] px-3.5 py-2.5 text-xs text-[#F0E6D0] placeholder-[#9A7D5A]/50 focus:outline-none focus:border-[#E8A020]/30"
              />
              <button type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-br from-[#E8A020] to-[#B86A1A] text-[#0A0806] text-xs font-bold hover:shadow-[0_4px_15px_rgba(232,160,32,0.3)] active:scale-[0.98] transition-all disabled:opacity-50">
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <><Key size={13} /> Unlock</>}
              </button>
            </form>
          </div>
        )}

        {/* Unlocked State */}
        {isUnlocked && (
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A7D5A]" />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#2A1E10] bg-[#1E160D] text-xs text-[#F0E6D0] placeholder-[#9A7D5A]/50 focus:outline-none focus:border-[#E8A020]/30"
              />
            </div>

            {/* Clipboard timer */}
            {clipboardTimer !== null && (
              <div className="rounded-lg border border-[#E8A020]/10 bg-[#141009] p-2.5 text-[11px] flex items-center justify-between">
                <span className="text-[#9A7D5A]">Clipboard purge in:</span>
                <span className="font-mono text-[#E8A020] font-bold">{clipboardTimer}s</span>
              </div>
            )}

            {/* Entries */}
            <div className="flex flex-col gap-2.5 min-h-[220px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12">
                  <RefreshCw size={20} className="text-[#E8A020] animate-spin mb-2" />
                  <span className="text-xs text-[#9A7D5A]">Decrypting vault...</span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                  <Globe size={24} className="text-[#2A1E10] mb-2" />
                  <span className="text-xs text-[#9A7D5A] font-semibold">No credentials found</span>
                  <span className="text-[10px] text-[#9A7D5A]/60 mt-1 max-w-[200px]">
                    {searchQuery ? 'Try a different search term.' : 'Add credentials on the Sphynx dashboard.'}
                  </span>
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isRecent = recentIds.includes(entry.id);
                  return (
                    <div key={entry.id} className="rounded-xl border border-[#2A1E10] bg-[#141009] p-3.5 hover:border-[#E8A020]/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col truncate max-w-[170px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#F0E6D0] truncate">{entry.label}</span>
                            {isRecent && <Clock size={9} className="text-[#E8A020] shrink-0" />}
                          </div>
                          <span className="text-[10px] text-[#9A7D5A] truncate">{entry.username || 'no username'}</span>
                        </div>
                        <button onClick={() => handleAutofillActiveTab(entry.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#E8A020]/10 hover:bg-[#E8A020]/20 border border-[#E8A020]/20 text-[#E8A020] text-[10px] font-bold transition-all">
                          Autofill
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 border-t border-[#2A1E10] pt-2.5">
                        <button onClick={() => handleCopyToClipboard(entry.username, entry.id, 'user')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[#1E160D] hover:bg-[#2A1E10] text-[#9A7D5A] hover:text-[#F0E6D0] text-[10px] font-medium transition-all">
                          {copiedId === entry.id && copiedType === 'user' ? <Check size={10} className="text-[#5EAA7A]" /> : <Copy size={10} />}
                          User
                        </button>
                        <button onClick={() => handleCopyToClipboard(entry.plaintext, entry.id, 'pass')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[#1E160D] hover:bg-[#2A1E10] text-[#9A7D5A] hover:text-[#F0E6D0] text-[10px] font-medium transition-all">
                          {copiedId === entry.id && copiedType === 'pass' ? <Check size={10} className="text-[#5EAA7A]" /> : <Copy size={10} />}
                          Pass
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 py-2.5 border-t border-[#2A1E10] bg-[#0A0806] flex items-center justify-between text-[9px] text-[#9A7D5A]/60">
        <span className="flex items-center gap-1">
          <Shield size={9} className="text-[#E8A020]/40" />
          Zero-Knowledge
        </span>
        <span className="font-mono">v1.0.0</span>
      </footer>
    </div>
  );
}
