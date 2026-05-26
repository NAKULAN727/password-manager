'use client';

import React, { useState } from 'react';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { decryptEntry } from '../../lib/crypto/vault';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  Calendar,
  Lock,
  Unlock
} from 'lucide-react';

interface VaultTableProps {
  entries: EncryptedVaultEntry[];
  onEditClick: (entry: EncryptedVaultEntry & { decryptedPassword?: string }) => void;
}

export function VaultTable({ entries, onEditClick }: VaultTableProps) {
  const { kVault, deleteEntry } = useVaultStore();
  
  // Local decrypted cache
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Handles local on-the-fly browser GCM decryption
  const handleToggleDecrypt = async (entry: EncryptedVaultEntry) => {
    if (!kVault) return;

    if (decryptedCache[entry.id]) {
      const updated = { ...decryptedCache };
      delete updated[entry.id];
      setDecryptedCache(updated);
      return;
    }

    try {
      setDecryptingId(entry.id);
      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
      setDecryptedCache(prev => ({ ...prev, [entry.id]: plaintext }));
    } catch (err) {
      console.error('Local decryption failed:', err);
      alert('Decryption failed: signature salt mismatch or corrupted payload.');
    } finally {
      setDecryptingId(null);
    }
  };

  // Secure clipboard copier - overwrites clipboard with empty string after 15 seconds
  const handleCopyPassword = async (entry: EncryptedVaultEntry) => {
    if (!kVault) return;

    try {
      // 1. Decrypt locally on the fly
      const plaintext = decryptedCache[entry.id] || 
                        await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      // 2. Write plaintext to clipboard
      await navigator.clipboard.writeText(plaintext);
      setCopiedId(entry.id);

      // 3. Register a 15-second clear timer
      setTimeout(async () => {
        try {
          // Clean clipboard to prevent leaks
          await navigator.clipboard.writeText('');
        } catch (e) {}
        setCopiedId(null);
      }, 15000);

    } catch (err) {
      console.error('Copy/Decrypt failed:', err);
      alert('Failed to copy: could not decrypt credentials.');
    }
  };

  const handleEdit = async (entry: EncryptedVaultEntry) => {
    if (!kVault) return;

    try {
      // Decrypt plaintext password so the edit modal can pre-fill it!
      const decryptedPassword = decryptedCache[entry.id] || 
                                await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
      
      onEditClick({ ...entry, decryptedPassword });
    } catch (err) {
      console.error('Failed to decrypt for edit:', err);
      onEditClick(entry); // Fallback to raw if decryption fails
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you absolutely sure you want to delete this secret? This action is irreversible.')) {
      await deleteEntry(id);
    }
  };

  return (
    <div className="overflow-x-auto w-full animate-fade-in">
      <table className="w-full text-left text-sm text-slate-300 min-w-[600px]">
        <thead className="border-b border-white/5 text-[10px] text-white/40 uppercase tracking-widest">
          <tr>
            <th className="pb-3 font-semibold">Service Name</th>
            <th className="pb-3 font-semibold">Username</th>
            <th className="pb-3 font-semibold">Decrypted Password</th>
            <th className="pb-3 font-semibold">Last Updated</th>
            <th className="pb-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        
        <tbody className="divide-y divide-white/5">
          {entries.map((entry) => {
            const isDecrypted = !!decryptedCache[entry.id];
            const isCopied = copiedId === entry.id;
            const isDecrypting = decryptingId === entry.id;
            const decryptedVal = decryptedCache[entry.id];

            return (
              <tr key={entry.id} className="group/row hover:bg-white/[0.01] transition-colors">
                {/* Service Column */}
                <td className="py-4 pr-3 font-semibold text-white flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
                  {entry.label}
                </td>
                
                {/* Username Column */}
                <td className="py-4 px-3 font-mono text-xs text-white/40">
                  {entry.username || '—'}
                </td>
                
                {/* Decrypted Password Column */}
                <td className="py-4 px-3 font-mono text-xs">
                  {isDecrypted ? (
                    <span className="text-purple-300 font-semibold px-2 py-1 rounded bg-purple-950/10 border border-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.05)] selection:bg-purple-500/30 selection:text-white select-all">
                      {decryptedVal}
                    </span>
                  ) : (
                    <span className="text-white/20 select-none tracking-widest font-sans">••••••••••••</span>
                  )}
                </td>

                {/* Updated At Column */}
                <td className="py-4 px-3 text-xs text-white/30 flex items-center gap-1.5 mt-1.5">
                  <Calendar size={12} />
                  {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                
                {/* Actions Column */}
                <td className="py-4 pl-3 text-right">
                  <div className="inline-flex items-center justify-end gap-4">
                    
                    {/* Decrypt Toggle Button */}
                    <button
                      onClick={() => handleToggleDecrypt(entry)}
                      disabled={isDecrypting}
                      className={`text-xs font-semibold flex items-center gap-1.5 transition-colors select-none ${
                        isDecrypted 
                          ? 'text-purple-400 hover:text-purple-300' 
                          : 'text-cyan-400 hover:text-cyan-300'
                      }`}
                      title={isDecrypted ? 'Hide secret' : 'Decrypt locally in browser'}
                    >
                      {isDecrypted ? <EyeOff size={13} /> : <Eye size={13} />}
                      {isDecrypting ? '...' : isDecrypted ? 'Hide' : 'Decrypt'}
                    </button>

                    {/* Secure Copy Button */}
                    <button
                      onClick={() => handleCopyPassword(entry)}
                      className={`transition-all duration-200 p-1.5 hover:bg-white/5 rounded-lg flex items-center justify-center gap-1 text-xs font-medium ${
                        isCopied ? 'text-emerald-400' : 'text-white/35 hover:text-white'
                      }`}
                      title={isCopied ? 'Copied! Clears in 15s.' : 'Copy decrypted to clipboard'}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      {isCopied && <span className="text-[10px]">15s</span>}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-white/35 hover:text-cyan-400 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                      title="Edit secret"
                    >
                      <Edit3 size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-white/35 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                      title="Delete secret"
                    >
                      <Trash2 size={13} />
                    </button>

                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
