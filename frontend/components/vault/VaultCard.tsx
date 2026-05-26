'use client';

import React, { useState } from 'react';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { decryptEntry } from '../../lib/crypto/vault';
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
  Globe
} from 'lucide-react';

interface VaultCardProps {
  entry: EncryptedVaultEntry;
  onEditClick: (entry: EncryptedVaultEntry & { decryptedPassword?: string }) => void;
}

export function VaultCard({ entry, onEditClick }: VaultCardProps) {
  const { kVault, deleteEntry } = useVaultStore();

  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleToggleDecrypt = async () => {
    if (!kVault) return;

    if (decryptedText !== null) {
      setDecryptedText(null);
      return;
    }

    try {
      setIsDecrypting(true);
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
    if (!kVault) return;

    try {
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
    if (!kVault) return;

    try {
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
    <Card className="flex flex-col gap-4 border-white/5 bg-white/[0.005] hover:bg-white/[0.015] p-5 h-full relative group">
      
      {/* Top Section: Service & Category */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-cyan-500/10 p-2 border border-cyan-500/20 text-cyan-400">
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
        <div className="text-white/20 group-hover:text-purple-400/50 transition-colors">
          {decryptedText !== null ? <Unlock size={14} /> : <Lock size={14} />}
        </div>
      </div>

      {/* Center Section: Credentials */}
      <div className="flex flex-col gap-2 rounded-xl bg-white/[0.01] border border-white/5 p-3 text-xs leading-relaxed text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-white/30 font-semibold flex items-center gap-1"><User size={12} /> Username</span>
          <span className="font-mono text-white/70">{entry.username || '—'}</span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-white/30 font-semibold">Password</span>
          <span className="font-mono">
            {decryptedText !== null ? (
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
            className="text-white/30 hover:text-cyan-400 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            title="Edit secret"
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
            className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold hover:bg-white/5 transition-all ${
              isCopied ? 'text-emerald-400' : 'text-white/30 hover:text-white'
            }`}
            title={isCopied ? 'Copied! Clears in 15s.' : 'Copy decrypted'}
          >
            {isCopied ? <Check size={13} /> : <Copy size={13} />}
            {isCopied && <span className="text-[9px]">15s</span>}
          </button>

          {/* Decrypt */}
          <button
            onClick={handleToggleDecrypt}
            disabled={isDecrypting}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 select-none ${
              decryptedText !== null
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
