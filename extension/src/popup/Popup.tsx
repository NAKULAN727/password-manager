import React, { useEffect, useState } from 'react';
import {
  Lock,
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
  ExternalLink,
  Fingerprint,
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
    const handleStorageChange = (_changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'session') checkStatus();
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => { chrome.storage.onChanged.removeListener(handleStorageChange); };
  }, []);

  const checkStatus = () => {
    chrome.runtime.sendMessage({ type: 'GET_VAULT_STATUS' }, (response) => {
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
      if (response?.success) setEntries(response.data);
      else setUserError(toUserError(response?.error || 'Failed to load.'));
    });
    chrome.runtime.sendMessage({ type: 'GET_RECENT_ACTIVITY' }, (response) => {
      if (response?.success) setRecentIds(response.data.map((r: any) => r.entryId));
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
      if (response?.success) { setIsUnlocked(true); loadEntries(); }
      else setUserError(toUserError(response?.error || 'Unlock failed.'));
    });
  };

  const handleLock = () => {
    chrome.runtime.sendMessage({ type: 'LOCK_VAULT' }, (response) => {
      if (response?.success) { setIsUnlocked(false); setEntries([]); setSearchQuery(''); setUserError(null); }
    });
  };

  const handleCopy = (text: string, entryId: string, type: 'user' | 'pass') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(entryId);
      setCopiedType(type);
      setClipboardTimer(30);
      if ((window as any)._clipInt) clearInterval((window as any)._clipInt);
      (window as any)._clipInt = setInterval(() => {
        setClipboardTimer((prev) => {
          if (prev !== null && prev <= 1) { clearInterval((window as any)._clipInt); navigator.clipboard.writeText(''); setCopiedId(null); setCopiedType(null); return null; }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    });
  };

  useEffect(() => { return () => { if ((window as any)._clipInt) clearInterval((window as any)._clipInt); }; }, []);

  const handleAutofill = (entryId: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FILL_ACTIVE_TAB', entryId }, (res) => {
          if (res?.success) window.close();
          else setUserError(toUserError(res?.error || 'Autofill failed.'));
        });
      }
    });
  };

  const sorted = [...entries].sort((a, b) => {
    const aR = recentIds.indexOf(a.id); const bR = recentIds.indexOf(b.id);
    if (aR !== -1 && bR === -1) return -1; if (aR === -1 && bR !== -1) return 1;
    if (aR !== -1 && bR !== -1) return aR - bR;
    return a.label.localeCompare(b.label);
  });
  const filtered = sorted.filter(e => e.label.toLowerCase().includes(searchQuery.toLowerCase()) || e.username.toLowerCase().includes(searchQuery.toLowerCase()));

  if (view === 'settings') {
    return <div className="h-full bg-[#0A0806] text-[#F0E6D0]"><Settings onBack={() => setView('main')} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0806] text-[#F0E6D0] select-none overflow-hidden">

      {/* ===== HEADER ===== */}
      <header className="shrink-0 px-5 pt-5 pb-4 bg-gradient-to-b from-[#141009] to-[#0A0806] border-b border-[#2A1E10]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="logo.png"
              alt="Sphynx"
              className="w-10 h-10 object-contain rounded-lg transition-transform duration-200 hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
            />
            <div className="hidden w-10 h-10 rounded-lg bg-gradient-to-br from-[#E8A020]/20 to-[#B86A1A]/10 border border-[#E8A020]/20 items-center justify-center">
              <Shield size={18} className="text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-[#F0E6D0]">SPHYNX</h1>
              <p className="text-[9px] text-[#9A7D5A] tracking-wider uppercase font-medium">Zero-Knowledge Vault</p>
            </div>
          </div>
          {isUnlocked && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setView('settings')} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9A7D5A] hover:text-[#F0E6D0] hover:bg-[#1E160D] transition-all duration-200">
                <SettingsIcon size={13} />
              </button>
              <button onClick={handleLock} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#E8A020] hover:bg-[#E8A020]/10 border border-[#2A1E10] hover:border-[#E8A020]/30 transition-all duration-200">
                <Lock size={12} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ===== STATUS CARD ===== */}
      <div className="shrink-0 mx-5 mb-4 rounded-xl border border-[#2A1E10] bg-[#141009] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${address ? (isUnlocked ? 'bg-[#5EAA7A]' : 'bg-[#E8A020]') : 'bg-[#CC4A3A]'}`} />
            <span className="text-[11px] font-medium text-[#9A7D5A]">
              {!address ? 'Not Connected' : isUnlocked ? 'Vault Unlocked' : 'Vault Locked'}
            </span>
          </div>
          {address && (
            <span className="text-[9px] font-mono text-[#9A7D5A]/60 truncate max-w-[120px]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto px-5 pb-4">

        {/* Error */}
        {userError && (
          <div className="rounded-xl border border-[#CC4A3A]/15 bg-[#CC4A3A]/5 p-3 mb-3 flex items-center gap-2">
            <AlertTriangle size={12} className="text-[#CC4A3A] shrink-0" />
            <span className="text-[10px] text-[#CC4A3A] flex-1">{userError.message}</span>
            {userError.action && (
              <button onClick={checkStatus} className="text-[9px] font-bold text-[#E8A020] shrink-0">{userError.action}</button>
            )}
          </div>
        )}

        {/* Clipboard timer */}
        {clipboardTimer !== null && (
          <div className="rounded-lg border border-[#E8A020]/10 bg-[#141009] p-2 mb-3 flex items-center justify-between">
            <span className="text-[10px] text-[#9A7D5A]">Clipboard auto-clear</span>
            <span className="text-[10px] font-mono font-bold text-[#E8A020]">{clipboardTimer}s</span>
          </div>
        )}

        {/* === NOT CONNECTED STATE === */}
        {syncWarning && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E8A020]/[0.06] border border-[#E8A020]/15 flex items-center justify-center mb-4">
              <Globe size={24} className="text-[#E8A020]/60" />
            </div>
            <h3 className="text-sm font-bold text-[#F0E6D0] mb-1">Not Connected</h3>
            <p className="text-[11px] text-[#9A7D5A] max-w-[220px] leading-relaxed mb-5">
              Open the Sphynx dashboard and connect your wallet to get started.
            </p>
            <a href="http://localhost:3000" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-br from-[#E8A020] to-[#B86A1A] text-[#0A0806] text-xs font-bold transition-all hover:shadow-[0_4px_15px_rgba(232,160,32,0.25)]">
              Open Sphynx <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* === LOCKED STATE === */}
        {!syncWarning && !isUnlocked && (
          <div className="flex flex-col items-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-[#E8A020]/[0.06] border border-[#E8A020]/15 flex items-center justify-center mb-4">
              <Fingerprint size={24} className="text-[#E8A020]/70" />
            </div>
            <h3 className="text-sm font-bold text-[#F0E6D0] mb-1">Unlock Vault</h3>
            <p className="text-[11px] text-[#9A7D5A] mb-5">Enter your master password to decrypt</p>

            <form onSubmit={handleUnlock} className="w-full max-w-[280px] flex flex-col gap-3">
              <input
                type="password"
                required
                placeholder="Master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full rounded-xl border border-[#2A1E10] bg-[#1E160D] px-4 py-2.5 text-xs text-[#F0E6D0] placeholder-[#9A7D5A]/40 focus:outline-none focus:border-[#E8A020]/30 transition-colors"
              />
              <button type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-[#E8A020] to-[#B86A1A] text-[#0A0806] text-xs font-bold transition-all hover:shadow-[0_4px_15px_rgba(232,160,32,0.25)] active:scale-[0.98] disabled:opacity-50">
                {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <><Key size={12} /> Unlock</>}
              </button>
            </form>
          </div>
        )}

        {/* === UNLOCKED STATE === */}
        {isUnlocked && (
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9A7D5A]/60" />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#2A1E10] bg-[#1E160D] text-xs text-[#F0E6D0] placeholder-[#9A7D5A]/40 focus:outline-none focus:border-[#E8A020]/20 transition-colors"
              />
            </div>

            {/* Credential List */}
            <div className="flex flex-col gap-2 min-h-[200px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw size={18} className="text-[#E8A020] animate-spin mb-2" />
                  <span className="text-[10px] text-[#9A7D5A]">Decrypting vault...</span>
                </div>
              ) : filtered.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-3xl mb-3">🔐</div>
                  <h3 className="text-xs font-bold text-[#F0E6D0] mb-1">
                    {searchQuery ? 'No results' : 'Your vault is empty'}
                  </h3>
                  <p className="text-[10px] text-[#9A7D5A] max-w-[200px] leading-relaxed mb-4">
                    {searchQuery ? 'Try a different search term.' : 'Save passwords while browsing and they will appear here.'}
                  </p>
                  {!searchQuery && (
                    <a href="http://localhost:3000/dashboard" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2A1E10] text-[10px] font-semibold text-[#9A7D5A] hover:text-[#F0E6D0] hover:border-[#E8A020]/30 transition-all">
                      Open Dashboard <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              ) : (
                filtered.map((entry) => (
                  <CredentialCard
                    key={entry.id}
                    entry={entry}
                    isRecent={recentIds.includes(entry.id)}
                    copiedId={copiedId}
                    copiedType={copiedType}
                    onAutofill={() => handleAutofill(entry.id)}
                    onCopyUser={() => handleCopy(entry.username, entry.id, 'user')}
                    onCopyPass={() => handleCopy(entry.plaintext, entry.id, 'pass')}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="shrink-0 px-5 py-3 border-t border-[#2A1E10] bg-[#0A0806] flex items-center justify-between">
        <span className="text-[9px] text-[#9A7D5A]/50 flex items-center gap-1">
          <Shield size={8} className="text-[#E8A020]/30" /> Zero-Knowledge Architecture
        </span>
        <span className="text-[8px] font-mono text-[#9A7D5A]/30">v1.0.0</span>
      </footer>
    </div>
  );
}

// ============================================================
// CREDENTIAL CARD COMPONENT
// ============================================================

function CredentialCard({ entry, isRecent, copiedId, copiedType, onAutofill, onCopyUser, onCopyPass }: {
  entry: DecryptedVaultEntry;
  isRecent: boolean;
  copiedId: string | null;
  copiedType: 'user' | 'pass' | null;
  onAutofill: () => void;
  onCopyUser: () => void;
  onCopyPass: () => void;
}) {
  const isCopiedUser = copiedId === entry.id && copiedType === 'user';
  const isCopiedPass = copiedId === entry.id && copiedType === 'pass';

  // Generate a favicon-style icon from the label
  const initial = entry.label.charAt(0).toUpperCase();

  return (
    <div className="group rounded-xl border border-[#2A1E10] bg-[#141009] p-3 hover:border-[#E8A020]/15 transition-all duration-200">
      {/* Top row: icon + info + autofill */}
      <div className="flex items-center gap-3">
        {/* Service icon */}
        <div className="w-8 h-8 rounded-lg bg-[#1E160D] border border-[#2A1E10] flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#E8A020]/70">{initial}</span>
        </div>

        {/* Label + username */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#F0E6D0] truncate">{entry.label}</span>
            {isRecent && <Clock size={8} className="text-[#E8A020]/60 shrink-0" />}
          </div>
          <span className="text-[10px] text-[#9A7D5A] truncate block">{entry.username || 'No username'}</span>
        </div>

        {/* Autofill button */}
        <button
          onClick={onAutofill}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-[#E8A020]/10 to-[#B86A1A]/5 border border-[#E8A020]/15 text-[#E8A020] text-[9px] font-bold uppercase tracking-wider hover:border-[#E8A020]/40 hover:shadow-[0_2px_10px_rgba(232,160,32,0.1)] transition-all"
        >
          Fill
        </button>
      </div>

      {/* Bottom row: copy actions */}
      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[#2A1E10]/60">
        <button onClick={onCopyUser}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-medium text-[#9A7D5A] hover:text-[#F0E6D0] bg-[#0A0806] hover:bg-[#1E160D] border border-transparent hover:border-[#2A1E10] transition-all">
          {isCopiedUser ? <Check size={9} className="text-[#5EAA7A]" /> : <Copy size={9} />}
          {isCopiedUser ? 'Copied' : 'Username'}
        </button>
        <button onClick={onCopyPass}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-medium text-[#9A7D5A] hover:text-[#F0E6D0] bg-[#0A0806] hover:bg-[#1E160D] border border-transparent hover:border-[#2A1E10] transition-all">
          {isCopiedPass ? <Check size={9} className="text-[#5EAA7A]" /> : <Copy size={9} />}
          {isCopiedPass ? 'Copied' : 'Password'}
        </button>
      </div>
    </div>
  );
}
