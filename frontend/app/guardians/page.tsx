'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore } from '../../store/useVaultStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { GuardianCircleView } from '../../components/guardian/GuardianCircleView';
import { RecoveryProgress } from '../../components/guardian/RecoveryProgress';
import {
  ArrowLeft,
  Shield,
  UserPlus,
  Lock,
  Power,
  Users,
  AlertTriangle,
  CheckCircle2,
  Copy,
  RefreshCw,
  Scroll,
} from 'lucide-react';

/**
 * Guardian Management & Recovery Page — Phase 8
 * 
 * "The Circle of Guardians" — a ceremonial, trustworthy interface
 * for managing decentralized recovery guardians.
 */
export default function GuardiansPage() {
  const router = useRouter();
  const { isAuthenticated, address, clearSession } = useAuthStore();
  const { isUnlocked, lockVault } = useVaultStore();
  const {
    circle,
    isLoadingCircle,
    recoveryRequest,
    hasActiveRequest,
    isLoadingRecovery,
    auditTrail,
    error,
    fetchCircle,
    inviteGuardian,
    revokeGuardian,
    fetchRecoveryStatus,
    createRecoveryRequest,
    cancelRecovery,
    fetchAuditTrail,
    setError,
  } = useGuardianStore();

  // Local UI state
  const [inviteAddress, setInviteAddress] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  // Route guards
  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !isUnlocked) router.push('/dashboard');
  }, [isAuthenticated, isUnlocked, router]);

  // Fetch data on mount
  useEffect(() => {
    if (isUnlocked) {
      fetchCircle();
      fetchRecoveryStatus();
    }
  }, [isUnlocked, fetchCircle, fetchRecoveryStatus]);

  const handleLogout = () => {
    lockVault();
    clearSession();
    router.push('/login');
  };

  const handleInvite = async () => {
    if (!inviteAddress) return;
    try {
      await inviteGuardian(inviteAddress, threshold);
      setInviteAddress('');
      setShowInviteForm(false);
    } catch {}
  };

  const handleCreateRecovery = async () => {
    try {
      await createRecoveryRequest();
    } catch {}
  };

  if (!isAuthenticated || !isUnlocked) return null;

  const guardians = circle?.guardians || [];
  const activeGuardians = guardians.filter(g => g.status === 'accepted');
  const circleReady = activeGuardians.length >= (circle?.threshold || 3);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 pb-20 relative">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/3 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-emerald-500/2 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#090D16]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="px-3 py-2 border-white/10 hover:border-white/20 text-white/50 hover:text-white text-xs gap-1.5">
                <ArrowLeft size={13} />
                Vault
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#D4AF37]" />
              <h1 className="text-sm font-bold text-white">Circle of Guardians</h1>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <Button variant="outline" onClick={lockVault} className="px-4 py-2 border-[#D4AF37]/25 hover:border-[#D4AF37]/60 text-[#D4AF37] hover:text-white text-xs font-bold gap-1.5">
              <Lock size={13} />
              Lock
            </Button>
            <Button variant="outline" onClick={handleLogout} className="px-4 py-2 border-white/10 hover:border-red-500/20 text-white/50 hover:text-red-400 text-xs font-semibold gap-1.5">
              <Power size={13} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 pt-10 sm:px-8 animate-fade-in">
        
        {/* Page Title */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              The Circle of Guardians
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Designate trusted wallets to protect your sanctuary through decentralized recovery
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchAuditTrail(); setShowAudit(!showAudit); }}
              className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1.5 font-semibold border border-white/10 rounded-2xl px-4 py-2.5"
            >
              <Scroll size={12} />
              Audit Trail
            </button>
            <button
              onClick={() => setShowInviteForm(true)}
              className="text-xs text-[#D4AF37] hover:text-white transition-colors flex items-center gap-1.5 font-semibold border border-[#D4AF37]/20 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 rounded-2xl px-4 py-2.5"
            >
              <UserPlus size={12} />
              Invite Guardian
            </button>
          </div>
        </div>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-4 mb-6 text-xs text-amber-300 flex items-center gap-2"
            >
              <AlertTriangle size={14} />
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-white/30 hover:text-white">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Left: Guardian Circle Visualization */}
          <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
            <h2 className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-6">
              Your Guardian Circle
            </h2>

            {isLoadingCircle ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="text-[#D4AF37] animate-spin" />
              </div>
            ) : guardians.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users size={32} className="text-white/10 mb-4" />
                <p className="text-sm text-slate-400 font-semibold">No guardians yet</p>
                <p className="text-xs text-white/30 mt-1 max-w-[250px]">
                  Invite trusted wallets to form your recovery circle. You need at least 3 guardians.
                </p>
              </div>
            ) : (
              <GuardianCircleView guardians={guardians} threshold={circle?.threshold || 0} />
            )}

            {/* Guardian list */}
            {guardians.length > 0 && (
              <div className="mt-6 flex flex-col gap-2">
                {guardians.map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${g.status === 'accepted' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      <span className="text-xs font-mono text-slate-300">
                        {g.guardianAddress.slice(0, 6)}...{g.guardianAddress.slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wider font-semibold ${g.status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {g.status}
                      </span>
                      <button
                        onClick={() => revokeGuardian(g.id)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                        title="Revoke guardian"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Right: Recovery Status / Actions */}
          <div className="flex flex-col gap-6">
            {/* Recovery Status */}
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <h2 className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-6">
                Recovery Status
              </h2>

              {hasActiveRequest && recoveryRequest ? (
                <div className="flex flex-col gap-4">
                  <RecoveryProgress request={recoveryRequest} />
                  <Button
                    variant="outline"
                    onClick={cancelRecovery}
                    className="w-full text-xs border-red-500/20 text-red-400 hover:border-red-500/40 hover:text-red-300"
                  >
                    Cancel Recovery Request
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Shield size={32} className="text-white/10" />
                  <p className="text-xs text-slate-400 text-center max-w-[250px]">
                    No active recovery request. Your sanctuary is secure.
                  </p>
                  {circleReady && (
                    <Button
                      variant="outline"
                      onClick={handleCreateRecovery}
                      disabled={isLoadingRecovery}
                      className="text-xs border-[#D4AF37]/20 text-[#D4AF37] hover:border-[#D4AF37]/50 gap-1.5"
                    >
                      <Shield size={12} />
                      Initiate Recovery
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Security Info */}
            <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
              <h3 className="text-xs font-bold text-[#D4AF37] flex items-center gap-2 mb-3">
                <Shield size={14} />
                Recovery Protections
              </h3>
              <ul className="flex flex-col gap-2 text-[10px] text-slate-400 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                  24-hour cooldown before approvals can be processed
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                  7-day global cooldown between successful recoveries
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                  Guardian approvals expire after 48 hours
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                  Immutable audit trail of all recovery events
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                  No single guardian can authorize recovery alone
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Invite Guardian Modal */}
        <AnimatePresence>
          {showInviteForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setShowInviteForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
              >
                <Card className="border-[#D4AF37]/15 bg-[#090D16]/95 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                  <h3 className="text-lg font-bold text-white mb-1">Invite Guardian</h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Enter the Ethereum address of a trusted wallet to join your recovery circle.
                  </p>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1.5">
                        Guardian Wallet Address
                      </label>
                      <input
                        type="text"
                        value={inviteAddress}
                        onChange={(e) => setInviteAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/30"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold block mb-1.5">
                        Recovery Threshold
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={6}
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]/30"
                      />
                      <p className="text-[9px] text-white/30 mt-1">
                        Minimum approvals needed for recovery (2 to total-1)
                      </p>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowInviteForm(false)}
                        className="flex-1 text-xs border-white/10 text-white/50"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleInvite}
                        className="flex-1 text-xs gap-1.5"
                      >
                        <UserPlus size={12} />
                        Send Invitation
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audit Trail Panel */}
        <AnimatePresence>
          {showAudit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                <h3 className="text-xs font-bold text-[#D4AF37] flex items-center gap-2 mb-4">
                  <Scroll size={14} />
                  Recovery Audit Trail
                </h3>
                {auditTrail.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No audit events recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {auditTrail.map((event) => (
                      <div key={event.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-[#D4AF37] uppercase">{event.eventType.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-[9px] text-white/30 font-mono">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 rounded-2xl border border-[#D4AF37]/10 bg-amber-950/5 p-4 text-center"
        >
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg mx-auto">
            🔒 Recovery shares are encrypted client-side before storage. The server never possesses your VEK, 
            sanctuary phrase, or any material capable of decrypting your vault. Guardians learn nothing about your credentials.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
