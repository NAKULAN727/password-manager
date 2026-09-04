'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useVaultStore } from '../../store/useVaultStore';
import { useAuditStore } from '../../store/useAuditStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HealthScoreRing } from '../../components/audit/HealthScoreRing';
import { StrengthDistribution } from '../../components/audit/StrengthDistribution';
import { ReusePanel } from '../../components/audit/ReusePanel';
import { AgingPanel } from '../../components/audit/AgingPanel';
import { RecommendationsFeed } from '../../components/audit/RecommendationsFeed';
import {
  ArrowLeft,
  Flower2,
  RefreshCw,
  Lock,
  Power,
  Loader2,
} from 'lucide-react';

/**
 * Security Audit Garden — Phase 7
 * 
 * A premium security intelligence dashboard that helps users understand
 * and improve their vault's security posture through a calm, educational,
 * garden-themed experience.
 */
export default function AuditPage() {
  const router = useRouter();
  const { isAuthenticated, clearSession } = useAuthStore();
  const { isUnlocked, lockVault, vaultEntries } = useVaultStore();
  const {
    healthScore,
    securityLevel,
    strengthData,
    reuseGroups,
    agingAnalysis,
    recommendations,
    totalRecommendations,
    isAllClear,
    allClearMessage,
    isStale,
    isAnalyzing,
    analysisError,
    failedEntryIds,
    runAnalysis,
  } = useAuditStore();

  // Route guards
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !isUnlocked) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isUnlocked, router]);

  // Auto-run analysis when stale and page is visible
  useEffect(() => {
    if (isUnlocked && isStale && !isAnalyzing) {
      runAnalysis();
    }
  }, [isUnlocked, isStale, isAnalyzing, runAnalysis]);

  const handleLogout = () => {
    lockVault();
    clearSession();
    router.push('/login');
  };

  if (!isAuthenticated || !isUnlocked) {
    return null;
  }

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
              <Flower2 size={18} className="text-[#D4AF37]" />
              <h1 className="text-sm font-bold text-white">Security Garden</h1>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              onClick={lockVault}
              className="px-4 py-2 border-[#D4AF37]/25 hover:border-[#D4AF37]/60 text-[#D4AF37] hover:text-white text-xs font-bold gap-1.5"
            >
              <Lock size={13} />
              Lock
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 pt-10 sm:px-8 animate-fade-in">
        
        {/* Page Title */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] bg-clip-text text-transparent">
              The Security Garden
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              A calm overview of your vault's health — nurture your credentials with care
            </p>
          </div>

          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="text-xs text-[#D4AF37]/70 hover:text-white transition-colors flex items-center gap-1.5 font-semibold border border-[#D4AF37]/15 bg-white/[0.01] hover:bg-[#D4AF37]/5 rounded-2xl px-4 py-2.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />
            {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* Loading State */}
        {isAnalyzing && !strengthData.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <Loader2 size={32} className="text-[#D4AF37] animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-mono">Analyzing your sanctuary...</p>
            <p className="text-[10px] text-white/30 mt-2">All analysis occurs locally in your browser</p>
          </motion.div>
        )}

        {/* Error State */}
        {analysisError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-amber-500/15 bg-amber-950/10 p-4 mb-8 text-xs text-amber-300"
          >
            {analysisError}
          </motion.div>
        )}

        {/* Dashboard Grid */}
        {!isAnalyzing || strengthData.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Left Column: Health Score + Strength */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Health Score Card */}
              <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col items-center">
                <h2 className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-6 self-start">
                  Sanctuary Health
                </h2>
                
                {vaultEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Flower2 size={32} className="text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Your garden is empty</p>
                    <p className="text-[10px] text-white/30 mt-1 max-w-[200px] mx-auto">
                      Add credentials to your vault to see your security health bloom.
                    </p>
                  </div>
                ) : (
                  <HealthScoreRing score={healthScore} level={securityLevel} />
                )}
              </Card>

              {/* Strength Distribution Card */}
              {strengthData.length > 0 && (
                <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                  <StrengthDistribution strengthData={strengthData} />
                </Card>
              )}
            </div>

            {/* Right Column: Reuse + Aging + Recommendations */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Reuse Detection */}
              <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                <ReusePanel
                  reuseGroups={reuseGroups}
                  totalEntries={vaultEntries.length}
                  failedEntryIds={failedEntryIds}
                />
              </Card>

              {/* Aging Analysis */}
              <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                <AgingPanel agingAnalysis={agingAnalysis} />
              </Card>

              {/* Recommendations Feed */}
              <Card className="border-[#D4AF37]/10 bg-[#090D16]/50 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                <RecommendationsFeed
                  recommendations={recommendations}
                  totalCount={totalRecommendations}
                  isAllClear={isAllClear}
                  allClearMessage={allClearMessage}
                />
              </Card>
            </div>
          </div>
        ) : null}

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 rounded-2xl border border-[#D4AF37]/10 bg-amber-950/5 p-4 text-center"
        >
          <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg mx-auto">
            🔒 All security analysis occurs exclusively in your browser. No passwords, hashes, or analysis results 
            are transmitted to any server. Your zero-knowledge guarantees remain intact.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
