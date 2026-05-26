'use client';

import React, { useState, useEffect } from 'react';
import { useVaultStore, EncryptedVaultEntry } from '../../store/useVaultStore';
import { Button } from '../ui/Button';
import { Shield, X, Eye, EyeOff, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit?: EncryptedVaultEntry & { decryptedPassword?: string } | null;
}

/**
 * Multi-mode Modal supporting secure ZK Add and Edit operations,
 * featuring a cryptographically secure local password generator.
 * Refactored to utilize Framer Motion for elegant cinematic transitions.
 */
export function PasswordModal({ isOpen, onClose, entryToEdit }: PasswordModalProps) {
  const { addEntry, editEntry, isLoading, error: vaultError, setError } = useVaultStore();

  // Inputs state
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UX state
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pre-fill inputs if in Edit mode
  useEffect(() => {
    if (entryToEdit) {
      setLabel(entryToEdit.label);
      setUsername(entryToEdit.username || '');
      setPassword(entryToEdit.decryptedPassword || '');
    } else {
      setLabel('');
      setUsername('');
      setPassword('');
    }
    setFormError(null);
    setError(null);
  }, [entryToEdit, isOpen, setError]);

  // Cryptographically secure, browser-native complex password generator
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,./<>?';
    let generated = '';
    const randomArray = new Uint32Array(16);
    
    // Web Crypto secure random values
    window.crypto.getRandomValues(randomArray);
    
    for (let i = 0; i < 16; i++) {
      generated += chars[randomArray[i] % chars.length];
    }
    setPassword(generated);
    setShowPassword(true); // Automatically reveal the freshly generated password
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !password) {
      setFormError('Service Name and Password are required.');
      return;
    }

    try {
      setFormError(null);
      if (entryToEdit) {
        // Edit Mode: local encrypt + PUT request
        await editEntry(entryToEdit.id, label.trim(), username.trim(), password);
      } else {
        // Create Mode: local encrypt + POST request
        await addEntry(label.trim(), username.trim(), password);
      }
      onClose(); // Close modal upon success
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the secret.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Background glass blur backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#090D16]/65 backdrop-blur-md"
          />

          {/* Modal Card container */}
          <motion.div 
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-[#090D16]/95 p-8 shadow-[0_0_50px_rgba(212,175,55,0.12)] backdrop-blur-2xl z-10"
          >
            
            {/* Ambient background accent */}
            <div className="absolute -right-20 -top-20 -z-10 h-40 w-40 rounded-full bg-[#D4AF37]/5 blur-[60px]" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-tr from-amber-600 to-[#D4AF37] p-2 shadow-[0_0_12px_rgba(212,175,55,0.2)] border border-[#D4AF37]/25">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#F8F3E7] font-mono">
                  {entryToEdit ? 'Edit Secure Secret' : 'Create New Secret'}
                </h3>
              </div>
              <button 
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {(formError || vaultError) && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-red-400 text-xs"
                >
                  <div className="font-semibold mb-0.5">Validation Alert</div>
                  {formError || vaultError}
                </motion.div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Service Name (Plaintext)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Account, GitHub Token"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="glow-input w-full rounded-xl border border-[#D4AF37]/15 bg-white/[0.015] px-4 py-3 text-sm text-[#F8F3E7] placeholder-white/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Username / email (Plaintext)
                </label>
                <input
                  type="text"
                  placeholder="e.g. user@gmail.com, admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glow-input w-full rounded-xl border border-[#D4AF37]/15 bg-white/[0.015] px-4 py-3 text-sm text-[#F8F3E7] placeholder-white/20 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Password / key (GCM Encrypted)
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-[#D4AF37] hover:text-[#e5c158] font-bold flex items-center gap-1 transition-colors select-none font-mono"
                  >
                    <Sparkles size={11} />
                    Generate Secure
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter confidential credential"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glow-input w-full rounded-xl border border-[#D4AF37]/15 bg-white/[0.015] pl-4 pr-12 py-3 text-sm text-[#F8F3E7] placeholder-white/20 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons Actions */}
              <div className="flex items-center gap-3.5 mt-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3"
                >
                  Cancel
                </Button>
                
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1 gap-1.5 py-3 font-semibold"
                >
                  {!isLoading && <RefreshCw size={14} />}
                  {isLoading ? 'Processing...' : entryToEdit ? 'Save Changes' : 'Encrypt & Save'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
