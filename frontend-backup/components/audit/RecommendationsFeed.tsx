'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recommendation, RecommendationCategory } from '../../lib/audit/recommendationEngine';
import { Lightbulb, Copy, Shield, Clock, ChevronDown, Sparkles } from 'lucide-react';

interface RecommendationsFeedProps {
  recommendations: Recommendation[];
  totalCount: number;
  isAllClear: boolean;
  allClearMessage: string;
}

const CATEGORY_CONFIG: Record<RecommendationCategory, { icon: React.ReactNode; color: string }> = {
  'reuse': { icon: <Copy size={12} />, color: 'text-amber-400' },
  'weak': { icon: <Shield size={12} />, color: 'text-yellow-400' },
  'aging': { icon: <Clock size={12} />, color: 'text-orange-400' },
};

const PAGE_SIZE = 5;

export function RecommendationsFeed({ recommendations, totalCount, isAllClear, allClearMessage }: RecommendationsFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleRecs = recommendations.slice(0, visibleCount);
  const hasMore = visibleCount < totalCount;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb size={15} className="text-[#D4AF37]" />
        <h3 className="text-sm font-bold text-white">Security Recommendations</h3>
        {totalCount > 0 && (
          <span className="text-[10px] text-white/30 font-mono ml-auto">
            {totalCount} suggestion{totalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* All Clear State */}
      {isAllClear && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-6 text-center"
        >
          <Sparkles size={24} className="text-[#D4AF37] mx-auto mb-3" />
          <p className="text-sm text-[#D4AF37] font-semibold mb-2">Sanctuary Flourishing</p>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {allClearMessage}
          </p>
        </motion.div>
      )}

      {/* Recommendations List */}
      {!isAllClear && totalCount === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-slate-400">
            Add credentials to your vault to receive personalized security guidance.
          </p>
        </div>
      )}

      {!isAllClear && totalCount > 0 && (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence>
            {visibleRecs.map((rec, idx) => {
              const config = CATEGORY_CONFIG[rec.category];
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white leading-snug">
                        {rec.title}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {rec.description}
                      </p>
                      <p className="text-[10px] text-[#D4AF37]/70 font-medium mt-1">
                        → {rec.action}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Show More */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="flex items-center justify-center gap-1.5 text-xs text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors py-2 font-semibold"
            >
              <ChevronDown size={14} />
              Show more suggestions ({totalCount - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
