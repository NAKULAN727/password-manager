'use client';

import React from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Search, X } from 'lucide-react';

/**
 * Premium search input component supporting debounced queries,
 * filtering vault listings by label and username tags.
 */
export function VaultSearch() {
  const { searchQuery, setSearchQuery } = useVaultStore();

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="relative w-full max-w-md animate-fade-in z-10">
      <div className="relative group">
        
        {/* Glow ambient search indicator on focus */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#7F00FF] to-[#00F2FE] rounded-2xl blur-md opacity-0 group-focus-within:opacity-10 transition-opacity duration-300 -z-10" />

        {/* Input box */}
        <input
          type="text"
          placeholder="Search by service name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/5 bg-white/[0.015] pl-11 pr-11 py-3 text-sm text-white placeholder-white/20 focus:border-[#7F00FF]/50 focus:bg-white/[0.025] focus:outline-none transition-all duration-300"
        />

        {/* Search magnifying glass icon */}
        <Search 
          size={16} 
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" 
        />

        {/* Clear query action */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all duration-200"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
