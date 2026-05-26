'use client';

import React, { useState } from 'react';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { decryptEntry, verifyEntryHMAC } from '../../lib/crypto/vault';
import { DecryptedPassword } from './DecryptedPassword';
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
  AlertTriangle
} from 'lucide-react';

interface VaultTableProps {
  entries: EncryptedVaultEntry[];
  onEditClick: (entry: EncryptedVaultEntry & { decryptedPassword?: string }) => void;
}

export function VaultTable({ entries, onEditClick }: VaultTableProps) {
  const { 
    kVault, 
    kIntegrity, 
    deleteEntry, 
    integrityViolations, 
    setIntegrityViolation,
    activeClipboardTimer,
    setActiveClipboardTimer 
  } = useVaultStore();
  
  // Local decrypted cache
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Handles local on-the-fly browser GCM decryption and HMAC validation
  const handleToggleDecrypt = async (entry: EncryptedVaultEntry) => {
    if (!kVault || !kIntegrity) return;

    if (decryptedCache[entry.id]) {
      const updated = { ...decryptedCache };
      delete updated[entry.id];
      setDecryptedCache(updated);
      return;
    }

    try {
      setDecryptingId(entry.id);

      // Verify HMAC-SHA256 checksum before executing local GCM decryption
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
          return;
        }
      }

      const plaintext = await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);
      setDecryptedCache(prev => ({ ...prev, [entry.id]: plaintext }));
    } catch (err) {
      console.error('Local decryption failed:', err);
    } finally {
      setDecryptingId(null);
    }
  };

  // Secure clipboard copier - overwrites clipboard with empty string after 15 seconds
  const handleCopyPassword = async (entry: EncryptedVaultEntry) => {
    if (!kVault || !kIntegrity) return;

    // Block copy on tampered entries
    if (integrityViolations[entry.id]) {
      return;
    }

    try {
      // Verify HMAC-SHA256 checksum before copy
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
          return;
        }
      }

      // Decrypt locally on the fly
      const plaintext = decryptedCache[entry.id] || 
                        await decryptEntry(entry.ciphertext, entry.iv, entry.tag, kVault);

      // Write plaintext to clipboard
      await navigator.clipboard.writeText(plaintext);
      
      // Update global store active clipboard timer
      setActiveClipboardTimer({
        entryId: entry.id,
        label: entry.label,
        duration: 15000
      });

      // Register a 15-second clear timer
      setTimeout(async () => {
        try {
          const currentTimer = useVaultStore.getState().activeClipboardTimer;
          // Protects against newer copy overlaps
          if (currentTimer?.entryId === entry.id) {
            await navigator.clipboard.writeText('');
            setActiveClipboardTimer(null);
          }
        } catch (e) {}
      }, 15000);

    } catch (err) {
      console.error('Copy/Decrypt failed:', err);
    }
  };

  const handleEdit = async (entry: EncryptedVaultEntry) => {
    if (!kVault || !kIntegrity) return;

    // Block edit on tampered entries
    if (integrityViolations[entry.id]) {
      return;
    }

    try {
      // Verify HMAC-SHA256 checksum before pre-filling
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
          return;
        }
      }

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
            const isCopied = activeClipboardTimer?.entryId === entry.id;
            const isDecrypting = decryptingId === entry.id;
            const decryptedVal = decryptedCache[entry.id];
            const isTampered = !!integrityViolations[entry.id];

            return (
              <tr key={entry.id} className={`group/row hover:bg-white/[0.01] transition-colors ${isTampered ? 'bg-red-500/[0.02] hover:bg-red-500/[0.04]' : ''}`}>
                
                {/* Service Column */}
                <td className="py-4 pr-3 font-semibold text-white flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isTampered ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.6)]'}`} />
                  {entry.label}
                </td>
                
                {/* Username Column */}
                <td className="py-4 px-3 font-mono text-xs text-white/40">
                  {entry.username || '—'}
                </td>
                
                {/* Decrypted Password Column */}
                <td className="py-4 px-3">
                  {isTampered ? (
                    <span className="text-red-400 font-bold font-mono text-xs px-2.5 py-1 rounded bg-red-950/20 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)] flex items-center gap-1.5 max-w-fit select-none animate-pulse">
                      <AlertTriangle size={12} className="text-red-400" />
                      TAMPER DETECTED
                    </span>
                  ) : (
                    <DecryptedPassword 
                      password={decryptedVal} 
                      isDecrypted={isDecrypted} 
                    />
                  )}
                </td>

                {/* Updated At Column */}
                <td className="py-4 px-3 text-xs text-white/30">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </td>
                
                {/* Actions Column */}
                <td className="py-4 pl-3 text-right">
                  <div className="inline-flex items-center justify-end gap-4">
                    
                    {/* Decrypt Toggle Button */}
                    <button
                      onClick={() => handleToggleDecrypt(entry)}
                      disabled={isDecrypting || isTampered}
                      className={`text-xs font-bold flex items-center gap-1.5 transition-colors select-none ${
                        isTampered
                          ? 'text-red-500/35 cursor-not-allowed'
                          : isDecrypted 
                            ? 'text-amber-500 hover:text-amber-400' 
                            : 'text-[#D4AF37] hover:text-[#e5c158]'
                      }`}
                      title={isTampered ? 'Tampered credentials locked' : isDecrypted ? 'Hide secret' : 'Decrypt locally in browser'}
                    >
                      {isDecrypted ? <EyeOff size={13} /> : <Eye size={13} />}
                      {isDecrypting ? '...' : isDecrypted ? 'Hide' : 'Decrypt'}
                    </button>

                    {/* Secure Copy Button */}
                    <button
                      onClick={() => handleCopyPassword(entry)}
                      disabled={isTampered}
                      className={`transition-all duration-200 p-1.5 hover:bg-white/5 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold ${
                        isTampered
                          ? 'text-white/10 cursor-not-allowed hover:bg-transparent'
                          : isCopied 
                            ? 'text-emerald-400 font-bold' 
                            : 'text-white/35 hover:text-white'
                      }`}
                      title={isTampered ? 'Copy blocked: Tampered' : isCopied ? 'Copied! Clears in 15s.' : 'Copy decrypted to clipboard'}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      {isCopied && <span className="text-[10px]">15s</span>}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(entry)}
                      disabled={isTampered}
                      className={`transition-colors p-1.5 rounded-lg ${
                        isTampered
                          ? 'text-white/10 cursor-not-allowed'
                          : 'text-white/35 hover:text-[#D4AF37] hover:bg-white/5'
                      }`}
                      title={isTampered ? 'Edit blocked: Tampered' : 'Edit secret'}
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
