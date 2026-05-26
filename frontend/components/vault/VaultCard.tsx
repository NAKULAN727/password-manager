'use client';

import React, { useState } from 'react';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { decryptEntry, verifyEntryHMAC } from '../../lib/crypto/vault';
import { Card } from '../ui/Card';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Calendar,
  Lock,
  Unlock,
  User,
  Globe,
  AlertTriangle
} from 'lucide-react';

interface VaultCardProps {
  entry: EncryptedVaultEntry;
  onEditClick: (entry: EncryptedVaultEntry & { decryptedPassword?: string }) => void;
}

export function VaultCard({ entry, onEditClick }: VaultCardProps) {
  const { kVault, kIntegrity, deleteEntry, integrityViolations, setIntegrityViolation } = useVaultStore();

  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const isTampered = !!integrityViolations[entry.id];

  const handleToggleDecrypt = async () => {
    if (!kVault || !kIntegrity) return;

    if (decryptedText !== null) {
      setDecryptedText(null);
      return;
    }

    try {
      setIsDecrypting(true);

      // Verify HMAC integrity checksum before decryption
      if (entry.checksum) {
        const isValid = await verifyEntryHMAC(
          entry.ciphertext,
          entry.iv,
          entry.tag,
          entry.label,
          entry.username,
          entry.checksum,
          kIntegrity
        );
        if (!isValid) {
          setIntegrityViolation(entry.id, true);
          alert('SECURITY WARNING: Vault entry integrity violation detected! Decryption aborted.');
          return;
        }
      }

      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
      setDecryptedText(plaintext);
    } catch (err) {
      console.error('Local decryption failed:', err);
      alert('Decryption failed: signature salt mismatch or corrupted payload.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!kVault || !kIntegrity) return;

    if (isTampered) {
      alert('Action blocked: Cannot copy a tampered vault entry.');
      return;
    }

    try {
      // Verify HMAC integrity checksum before copying
      if (entry.checksum) {
        const isValid = await verifyEntryHMAC(
          entry.ciphertext,
          entry.iv,
          entry.tag,
          entry.label,
          entry.username,
          entry.checksum,
          kIntegrity
        );
        if (!isValid) {
          setIntegrityViolation(entry.id, true);
          alert('SECURITY WARNING: Vault entry integrity violation detected! Copy action aborted.');
          return;
        }
      }

      const plaintext = decryptedText || 
                        await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      await navigator.clipboard.writeText(plaintext);
      setIsCopied(true);

      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch (e) {}
        setIsCopied(false);
      }, 15000);

    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy: could not decrypt credentials.');
    }
  };

  const handleEdit = async () => {
    if (!kVault || !kIntegrity) return;

    if (isTampered) {
      alert('Action blocked: Cannot edit a tampered vault entry.');
      return;
    }

    try {
      // Verify HMAC integrity checksum before editing
      if (entry.checksum) {
        const isValid = await verifyEntryHMAC(
          entry.ciphertext,
          entry.iv,
          entry.tag,
          entry.label,
          entry.username,
          entry.checksum,
          kIntegrity
        );
        if (!isValid) {
          setIntegrityViolation(entry.id, true);
          alert('SECURITY WARNING: Vault entry integrity violation detected! Edit action aborted.');
          return;
        }
      }

      const decryptedPassword = decryptedText || 
                                await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
      
      onEditClick({ ...entry, decryptedPassword });
    } catch (err) {
      console.error('Failed to decrypt for edit:', err);
      onEditClick(entry);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you absolutely sure you want to delete this secret? This action is irreversible.')) {
      await deleteEntry(entry.id);
    }
  };

  return (
    <Card className={`flex flex-col gap-4 border-white/5 bg-white/[0.005] hover:bg-white/[0.015] p-5 h-full relative group transition-all ${isTampered ? 'border-red-500/25 bg-red-500/[0.005] hover:bg-red-500/[0.01]' : ''}`}>
      
      {/* Top Section: Service & Category */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg p-2 border text-xs font-semibold ${isTampered ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
            <Globe size={16} />
          </div>
          <div>
            <h4 className="font-bold text-white leading-tight">{entry.label}</h4>
            <span className="text-[10px] text-white/30 uppercase font-mono mt-0.5 block">
              ID: {entry.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Locked/Unlocked status */}
        <div className={`transition-colors ${isTampered ? 'text-red-400/50' : 'text-white/20 group-hover:text-purple-400/50'}`}>
          {isTampered ? <AlertTriangle size={14} /> : decryptedText !== null ? <Unlock size={14} /> : <Lock size={14} />}
        </div>
      </div>

      {/* Center Section: Credentials */}
      <div className={`flex flex-col gap-2 rounded-xl border p-3 text-xs leading-relaxed ${isTampered ? 'bg-red-500/[0.01] border-red-500/10 text-red-200' : 'bg-white/[0.01] border-white/5 text-slate-300'}`}>
        <div className="flex items-center justify-between">
          <span className="text-white/30 font-semibold flex items-center gap-1"><User size={12} /> Username</span>
          <span className="font-mono text-white/70">{entry.username || '—'}</span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-white/30 font-semibold">Password</span>
          <span className="font-mono">
            {isTampered ? (
              <span className="text-red-400 font-bold bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1 select-none animate-pulse">
                <AlertTriangle size={10} />
                TAMPERED
              </span>
            ) : decryptedText !== null ? (
              <span className="text-purple-300 font-semibold bg-purple-950/15 border border-purple-500/10 px-1.5 py-0.5 rounded selection:bg-purple-500/30 selection:text-white select-all">
                {decryptedText}
              </span>
            ) : (
              <span className="text-white/10 tracking-widest">••••••••</span>
            )}
          </span>
        </div>
      </div>

      {/* Date Indicator */}
      <div className="text-[10px] text-white/20 flex items-center gap-1 select-none">
        <Calendar size={10} />
        Updated {new Date(entry.updatedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>

      {/* Bottom Section: Operations */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-auto">
        <div className="flex gap-2">
          {/* Edit */}
          <button
            onClick={handleEdit}
            disabled={isTampered}
            className={`p-1.5 rounded-lg transition-colors ${
              isTampered ? 'text-white/10 cursor-not-allowed' : 'text-white/30 hover:text-cyan-400 hover:bg-white/5'
            }`}
            title={isTampered ? 'Edit blocked: Tampered' : 'Edit secret'}
          >
            <Edit3 size={13} />
          </button>
          
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="text-white/30 hover:text-red-400 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            title="Purge secret"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex gap-2">
          {/* Copy */}
          <button
            onClick={handleCopyPassword}
            disabled={isTampered}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
              isTampered
                ? 'text-white/10 cursor-not-allowed'
                : isCopied 
                  ? 'text-emerald-400' 
                  : 'text-white/30 hover:text-white hover:bg-white/5'
            }`}
            title={isTampered ? 'Copy blocked: Tampered' : isCopied ? 'Copied! Clears in 15s.' : 'Copy decrypted'}
          >
            {isCopied ? <Check size={13} /> : <Copy size={13} />}
            {isCopied && <span className="text-[9px]">15s</span>}
          </button>

          {/* Decrypt */}
          <button
            onClick={handleToggleDecrypt}
            disabled={isDecrypting || isTampered}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 select-none ${
              isTampered
                ? 'bg-transparent border-red-500/10 text-red-500/35 cursor-not-allowed'
                : decryptedText !== null
                  ? 'bg-purple-950/20 border-purple-500/20 text-purple-400 hover:text-purple-300'
                  : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400 hover:text-cyan-300'
            }`}
          >
            {decryptedText !== null ? <EyeOff size={12} /> : <Eye size={12} />}
            {isDecrypting ? '...' : decryptedText !== null ? 'Hide' : 'Decrypt'}
          </button>
        </div>
      </div>

    </Card>
  );
}
