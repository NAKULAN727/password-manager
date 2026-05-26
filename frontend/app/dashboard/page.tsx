'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { api } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

// Phase 3 Modular Vault Component Imports
import { SessionLock } from '../../components/vault/SessionLock';
import { PasswordModal } from '../../components/vault/PasswordModal';
import { VaultSearch } from '../../components/vault/VaultSearch';
import { VaultTable } from '../../components/vault/VaultTable';
import { VaultCard } from '../../components/vault/VaultCard';

import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Plus, 
  Database, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  RefreshCw,
  Search
} from 'lucide-react';

/**
 * Premium Zero-Knowledge Vault Dashboard.
 * Integrates inactivity autolocking, debounced search filters,
 * unified Add/Edit modal dialogs, secure clipboards, and responsive grids.
 */
export default function DashboardPage() {
  const router = useRouter();
  
  // Auth Store Session states
  const { address, isAuthenticated, clearSession } = useAuthStore();
  
  // Vault Store Cryptographic states
  const { 
    isUnlocked, 
    vaultEntries, 
    searchQuery,
    isLoading: vaultLoading, 
    error: vaultError,
    unlockVault, 
    lockVault, 
    fetchEntries
  } = useVaultStore();

  // Local UX state
  const [masterPassword, setMasterPassword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<EncryptedVaultEntry & { decryptedPassword?: string } | null>(null);

  // Dev Session diagnostics state
  const [profile, setProfile] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  // Authentication Route Guardian
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Query Backend Protected Route to Verify JWT Signature integrity on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchProfile = async () => {
      try {
        setApiLoading(true);
        setApiError(null);
        const data = await api.get('/auth/profile');
        setProfile(data.user);
      } catch (err: any) {
        console.error('Failed to verify JWT authorization status:', err);
        setApiError(err.message || 'API verification failed. Secure session has expired.');
      } finally {
        setApiLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  // Trigger atomic logout
  const handleLogout = () => {
    lockVault();
    clearSession();
    router.push('/login');
  };

  // Local key derivation and unlock trigger
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;
    await unlockVault(masterPassword);
    setMasterPassword(''); // Purge password input instantly
  };

  // Opens Edit modal pre-filled with plaintext credentials
  const handleEditClick = (entry: EncryptedVaultEntry & { decryptedPassword?: string }) => {
    setEntryToEdit(entry);
    setIsModalOpen(true);
  };

  if (!isAuthenticated) {
    return null; // Suppress client-side content flashes
  }

  // --- LOCAL DEBOUNCED / SEARCH FILTERING ---
  // Filters ZK vault entries locally based on label or username search inputs
  const filteredEntries = vaultEntries.filter((entry) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    return (
      entry.label.toLowerCase().includes(query) ||
      (entry.username && entry.username.toLowerCase().includes(query))
    );
  });

  // --- RENDERING ROUTE 1: Vault Locked Gateway Portal ---
  if (!isUnlocked) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] px-6 py-12">
        <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7F00FF]/5 blur-[120px] animate-pulse-glow" />

        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-2xl bg-gradient-to-tr from-[#7F00FF] to-[#E100FF] p-3.5 shadow-[0_0_20px_rgba(127,0,255,0.45)]">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-purple-400 bg-clip-text text-transparent">Sphynx Unlock</h2>
            <p className="mt-2 text-sm text-slate-400">
              Derive secure AES-256-GCM key locally to access secrets
            </p>
          </div>

          <Card glow className="border-white/5 bg-white/[0.01]">
            <form onSubmit={handleUnlock} className="flex flex-col gap-5">
              {vaultError && (
                <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-red-400 text-xs leading-relaxed animate-fade-in">
                  <div className="font-semibold mb-1">Key Derivation Error</div>
                  {vaultError}
                </div>
              )}

              {/* Wallet identifier info */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-slate-400 text-xs">
                <span className="text-[10px] text-white/30 uppercase block mb-1">Vault Salt (Address)</span>
                <span className="font-mono text-purple-300 break-all text-[11px]">{address}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter vault master password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="glow-input w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none"
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={vaultLoading}
                className="w-full gap-2 py-3.5 text-sm font-semibold"
              >
                {!vaultLoading && <Key size={18} />}
                {vaultLoading ? 'Deriving Keys Locally...' : 'Derive Vault Key & Unlock'}
              </Button>
            </form>
          </Card>

          <p className="mt-6 text-center text-xs text-white/20 leading-relaxed max-w-xs mx-auto">
            Metamask will prompt a deterministic signature to derive the vault's salt. Your Master Password and keys **never** leave your machine.
          </p>

          <div className="mt-8 text-center">
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-white/30 hover:text-white transition-colors"
            >
              Sign Out Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ROUTE 2: Vault Unlocked Workspace ---
  return (
    <div className="min-h-screen bg-[#0B0B0F] text-slate-100 pb-20">
      
      {/* Background inactivity monitoring trigger */}
      <SessionLock />

      {/* Unified password creation/edit modal */}
      <PasswordModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEntryToEdit(null);
        }}
        entryToEdit={entryToEdit}
      />
      
      {/* Radial ambient background glows */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#7F00FF]/4 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#00F2FE]/2 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      {/* Unlocked Header */}
      <header className="border-b border-white/5 bg-[#0B0B0F]/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-[#7F00FF] to-[#E100FF] p-2 shadow-[0_0_15px_rgba(127,0,255,0.4)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-white via-white to-purple-400 bg-clip-text text-transparent">
              SPHYNX
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-mono text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)] select-none">
              <Unlock size={12} className="animate-pulse" />
              Vault Unlocked
            </div>
            
            <Button
              variant="outline"
              onClick={lockVault}
              className="px-4 py-2 border-[#7F00FF]/25 hover:border-[#7F00FF]/50 text-purple-400 hover:text-white text-xs font-semibold gap-1.5"
            >
              <Lock size={13} />
              Lock Vault
            </Button>
            
            <Button
              variant="outline"
              onClick={handleLogout}
              className="px-4 py-2 border-white/10 hover:border-red-500/20 text-white/50 hover:text-red-400 text-xs font-semibold gap-1.5"
            >
              <Power size={13} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Unlocked Dashboard container */}
      <main className="mx-auto max-w-7xl px-6 pt-12 sm:px-8 animate-fade-in">
        
        {/* Workspace Title bar & CTAs */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Security Vault Workspace</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Manage your credentials locally with zero server trust
            </p>
          </div>
          
          <Button 
            variant="primary" 
            onClick={() => {
              setEntryToEdit(null);
              setIsModalOpen(true);
            }} 
            className="gap-1.5 text-xs font-semibold px-6 py-3"
          >
            <Plus size={14} />
            Create Secret
          </Button>
        </div>

        {/* Dashboard Workspace */}
        <div className="grid gap-8 lg:grid-cols-4">
          
          {/* Diagnostic status block (Left Panel - Span 1) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <Card className="border-[#7F00FF]/10 bg-white/[0.01] text-xs p-5">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Database size={15} className="text-purple-400" />
                Session Diagnostics
              </h2>

              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-0.5">derived K_vault status</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    AES-256-GCM (Secure)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-0.5">express JWT handshake</span>
                  {apiLoading ? (
                    <span className="text-slate-400 animate-pulse">Verifying...</span>
                  ) : apiError ? (
                    <span className="text-red-400 flex items-center gap-1">{apiError}</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={11} /> Handshake Verified</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-0.5">JWT Session Storage</span>
                  <span className="font-mono text-[10px] text-purple-300 bg-purple-950/15 border border-purple-500/10 rounded-xl px-2 py-1.5 block select-none mt-1">
                    🔒 HttpOnly Secure Cookie
                  </span>
                  <span className="text-[9px] text-white/30 mt-1 block select-none leading-relaxed">
                    Access tokens are hidden from JavaScript context to completely prevent token harvesting and XSS theft.
                  </span>
                </div>
              </div>
            </Card>

            {/* Note banner */}
            <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-4 text-xs leading-relaxed text-purple-300">
              <div className="font-semibold flex items-center gap-1.5 mb-1 text-purple-200">
                <Shield size={14} className="shrink-0" />
                Zero-Knowledge Proof
              </div>
              All credentials are encrypted and decrypted on-the-fly strictly inside your browser. No plaintext password is ever sent through a network.
            </div>
          </div>

          {/* Secure Locker workspace (Right Panel - Span 3) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Search and Filters Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <VaultSearch />
              
              <button
                onClick={fetchEntries}
                className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1.5 font-semibold border border-white/5 bg-white/[0.01] rounded-2xl px-4 py-2.5 z-10"
              >
                <RefreshCw size={12} className={vaultLoading ? "animate-spin" : ""} />
                Sync Locker
              </button>
            </div>

            {/* Vault List UI */}
            <Card className="bg-white/[0.005] border-white/5 flex flex-col p-6 min-h-[400px]">
              {vaultEntries.length === 0 ? (
                /* Empty state UI */
                <div className="flex flex-col items-center justify-center py-24 my-auto">
                  <Lock className="h-10 w-10 text-white/10 mb-4" />
                  <p className="text-sm font-semibold text-slate-400">Vault locker is empty</p>
                  <p className="text-xs text-white/20 mt-1 max-w-xs text-center leading-relaxed">
                    Local browser GCM encryptions are active. Click the "Create Secret" button to add your first secure record.
                  </p>
                </div>
              ) : filteredEntries.length === 0 ? (
                /* Search empty state */
                <div className="flex flex-col items-center justify-center py-24 my-auto">
                  <Search className="h-10 w-10 text-white/10 mb-4 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-400">No matching secrets found</p>
                  <p className="text-xs text-white/20 mt-1 max-w-xs text-center leading-relaxed">
                    We couldn't find any credentials matching "{searchQuery}". Check the query or clear the filter.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Desktop view: Vault Table (hidden on mobile, shown on md+) */}
                  <div className="hidden md:block">
                    <VaultTable 
                      entries={filteredEntries} 
                      onEditClick={handleEditClick} 
                    />
                  </div>

                  {/* Mobile view: Vault Cards Grid (shown on mobile, hidden on md+) */}
                  <div className="block md:hidden">
                    <div className="grid grid-cols-1 gap-5">
                      {filteredEntries.map((entry) => (
                        <VaultCard 
                          key={entry.id} 
                          entry={entry} 
                          onEditClick={handleEditClick} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

          </div>

        </div>

      </main>
    </div>
  );
}
