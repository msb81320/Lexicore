import React from 'react';
import { KnowledgeDimension } from '../types';

interface DimensionsRadarProps {
  mastery: Record<KnowledgeDimension, number>;
  activeDimension?: KnowledgeDimension;
  compact?: boolean;
}

const DIMENSION_CONFIG: Record<
  KnowledgeDimension,
  { label: string; shortLabel: string; color: string; desc: string }
> = {
  meaning_recall: {
    label: 'Meaning Recall',
    shortLabel: 'Meaning',
    color: '#38bdf8', // Sky
    desc: 'Core definition retrieval',
  },
  contextual_usage: {
    label: 'Contextual Usage',
    shortLabel: 'Context',
    color: '#818cf8', // Indigo
    desc: 'Authentic sentence application',
  },
  chunks_collocations: {
    label: 'Chunks & Collocations',
    shortLabel: 'Chunks',
    color: '#a855f7', // Purple
    desc: 'High-frequency native phrases',
  },
  nuance_distinction: {
    label: 'Nuance Distinction',
    shortLabel: 'Nuance',
    color: '#f59e0b', // Amber
    desc: 'Register and synonym boundaries',
  },
  active_production: {
    label: 'Active Production',
    shortLabel: 'Production',
    color: '#10b981', // Emerald
    desc: 'Unprompted active recall',
  },
};

export const DimensionsRadar: React.FC<DimensionsRadarProps> = ({
  mastery,
  activeDimension,
  compact = false,
}) => {
  const dimensions: KnowledgeDimension[] = [
    'meaning_recall',
    'contextual_usage',
    'chunks_collocations',
    'nuance_distinction',
    'active_production',
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-1.5 w-full">
        {dimensions.map((dim) => {
          const cfg = DIMENSION_CONFIG[dim];
          const val = Math.round(mastery[dim] || 0);
          const isTargeted = activeDimension === dim;

          return (
            <div
              key={dim}
              className={`p-1.5 rounded-lg border text-center transition ${
                isTargeted
                  ? 'bg-slate-800 border-sky-500/80 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="text-[10px] font-medium text-slate-400 truncate">{cfg.shortLabel}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: cfg.color }}>
                {val}%
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, val)}%`, backgroundColor: cfg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>Knowledge Dimensions</span>
        <span>Mastery Level</span>
      </div>

      <div className="space-y-2">
        {dimensions.map((dim) => {
          const cfg = DIMENSION_CONFIG[dim];
          const val = Math.round(mastery[dim] || 0);
          const isTargeted = activeDimension === dim;

          return (
            <div
              key={dim}
              className={`p-2.5 rounded-xl border transition ${
                isTargeted
                  ? 'bg-slate-800/90 border-sky-500/60 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/50 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className={`font-semibold ${isTargeted ? 'text-white' : 'text-slate-300'}`}>
                    {cfg.label}
                  </span>
                  {isTargeted && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Tested now
                    </span>
                  )}
                </div>
                <span className="font-bold text-xs" style={{ color: cfg.color }}>
                  {val}%
                </span>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, val)}%`, backgroundColor: cfg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
