import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Volume2,
  Trash2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  X,
  Layers,
  BookOpen,
  Calendar,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { VocabularyLearningUnit, Deck } from '../types';
import { db } from '../db';
import { createInitialFSRSState } from '../engine/scheduler';
import { DimensionsRadar } from './DimensionsRadar';
import { useSpeech } from '../hooks/useSpeech';

interface VocabularyBrowserProps {
  units: VocabularyLearningUnit[];
  decks: Deck[];
  onUnitsUpdated: () => void;
  onBackToDashboard?: () => void;
}

export const VocabularyBrowser: React.FC<VocabularyBrowserProps> = ({
  units,
  decks,
  onUnitsUpdated,
  onBackToDashboard,
}) => {
  const { speak } = useSpeech();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [selectedCefr, setSelectedCefr] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [inspectedUnit, setInspectedUnit] = useState<VocabularyLearningUnit | null>(null);

  // Filter units
  const filteredUnits = useMemo(() => {
    const nowIso = new Date().toISOString();
    return units.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const wordMatch = u.word.toLowerCase().includes(query);
        const defMatch = u.definition.toLowerCase().includes(query);
        const chunkMatch = u.chunks?.some((c) => c.text.toLowerCase().includes(query));
        if (!wordMatch && !defMatch && !chunkMatch) return false;
      }

      // Deck
      if (selectedDeckId !== 'all' && u.deckId !== selectedDeckId) {
        return false;
      }

      // CEFR
      if (selectedCefr !== 'all' && u.cefrLevel !== selectedCefr) {
        return false;
      }

      // State
      if (selectedState === 'due') {
        if (u.isSuspended || u.fsrs.due > nowIso || u.fsrs.reps === 0) return false;
      } else if (selectedState === 'new') {
        if (u.fsrs.reps > 0) return false;
      } else if (selectedState === 'learning') {
        if (u.fsrs.reps === 0 || u.fsrs.state === 2) return false;
      } else if (selectedState === 'suspended') {
        if (!u.isSuspended) return false;
      }

      return true;
    });
  }, [units, searchQuery, selectedDeckId, selectedCefr, selectedState]);

  // Actions
  const handleToggleSuspend = async (unit: VocabularyLearningUnit) => {
    const updated = { ...unit, isSuspended: !unit.isSuspended };
    await db.units.put(updated);
    onUnitsUpdated();
    if (inspectedUnit?.id === unit.id) {
      setInspectedUnit(updated);
    }
  };

  const handleResetSchedule = async (unit: VocabularyLearningUnit) => {
    if (!window.confirm(`Reset FSRS schedule for "${unit.word}" back to New?`)) return;
    const updated: VocabularyLearningUnit = {
      ...unit,
      fsrs: createInitialFSRSState(),
      updatedAt: Date.now(),
    };
    await db.units.put(updated);
    onUnitsUpdated();
    if (inspectedUnit?.id === unit.id) {
      setInspectedUnit(updated);
    }
  };

  const handleDeleteUnit = async (unitId: string, word: string) => {
    if (!window.confirm(`Permanently delete "${word}" and its learning history?`)) return;
    await db.units.delete(unitId);
    await db.reviewLogs.where('unitId').equals(unitId).delete();
    onUnitsUpdated();
    if (inspectedUnit?.id === unitId) {
      setInspectedUnit(null);
    }
  };

  const getDeckName = (deckId: string) => {
    const d = decks.find((item) => item.id === deckId);
    return d ? d.name : 'Deck';
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <div className="mb-4">
          <button
            id="btn-browser-back-dashboard"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Return to Home Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Vocabulary Browser</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {filteredUnits.length} of {units.length} Vocabulary Learning Units
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          id="input-search-vocab"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search words, definitions, native chunks..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs">
        {/* Deck Select */}
        <select
          id="filter-deck-select"
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shrink-0 focus:outline-none"
        >
          <option value="all">All Decks</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* CEFR Select */}
        <select
          id="filter-cefr-select"
          value={selectedCefr}
          onChange={(e) => setSelectedCefr(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shrink-0 focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>

        {/* State Select */}
        <select
          id="filter-state-select"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 shrink-0 focus:outline-none"
        >
          <option value="all">All States</option>
          <option value="due">Due Now</option>
          <option value="new">New (Unstudied)</option>
          <option value="learning">In Learning</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Units List */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No matching vocabulary found</p>
          <p className="text-xs text-slate-500 mt-1">Try loosening search filters or add new units.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUnits.map((unit) => {
            const isDue = unit.fsrs.due <= new Date().toISOString() && unit.fsrs.reps > 0;
            const isNew = unit.fsrs.reps === 0;

            return (
              <div
                key={unit.id}
                onClick={() => setInspectedUnit(unit)}
                className={`p-4 rounded-2xl border transition cursor-pointer hover:border-slate-700 bg-slate-900 ${
                  unit.isSuspended
                    ? 'opacity-60 border-slate-800 bg-slate-950/40'
                    : isDue
                    ? 'border-indigo-500/40 shadow-sm shadow-indigo-500/5'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white tracking-tight">{unit.word}</h3>
                    {unit.phonetic && (
                      <span className="text-xs text-slate-400 font-mono">{unit.phonetic}</span>
                    )}
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {unit.cefrLevel}
                    </span>
                    {unit.isSuspended ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Suspended
                      </span>
                    ) : isDue ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Due
                      </span>
                    ) : isNew ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        New
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(unit.word);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2.5">
                  {unit.definition}
                </p>

                {/* Chunks Preview */}
                {unit.chunks && unit.chunks.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-2">
                    {unit.chunks.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/40 shrink-0 truncate max-w-[200px]"
                      >
                        {c.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* FSRS Stats Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-medium">
                  <span>{getDeckName(unit.deckId)}</span>
                  <div className="flex items-center gap-2">
                    <span>Reps: {unit.fsrs.reps}</span>
                    <span>•</span>
                    <span>Stability: {unit.fsrs.stability ? Math.round(unit.fsrs.stability * 10) / 10 : 0}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECT DETAIL MODAL / SHEET */}
      {inspectedUnit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setInspectedUnit(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Word Header */}
            <div className="flex items-start justify-between pr-8 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-2xl font-bold tracking-tight">{inspectedUnit.word}</h3>
                  <span className="text-sm font-mono text-sky-400">{inspectedUnit.phonetic}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {inspectedUnit.cefrLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{inspectedUnit.partOfSpeech} • {inspectedUnit.register || 'General'}</p>
              </div>
              <button
                onClick={() => speak(inspectedUnit.word)}
                className="p-2.5 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Mnemonic (if present) */}
            {inspectedUnit.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-slate-800 max-h-56">
                <img
                  src={inspectedUnit.imageUrl}
                  alt={inspectedUnit.word}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Core Definition */}
            <div className="mb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Definition
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {inspectedUnit.definition}
              </p>
            </div>

            {/* Chunks & Collocations */}
            {inspectedUnit.chunks && inspectedUnit.chunks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>High-Frequency Chunks</span>
                </h4>
                <div className="space-y-2">
                  {inspectedUnit.chunks.map((chunk) => (
                    <div key={chunk.id} className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs">
                      <div className="flex items-center justify-between font-bold text-purple-200">
                        <span>{chunk.text}</span>
                        <button
                          onClick={() => speak(chunk.text)}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-slate-300 mt-1">{chunk.meaning}</p>
                      {chunk.example && (
                        <p className="text-[11px] text-slate-400 italic mt-1 font-serif">&ldquo;{chunk.example}&rdquo;</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            {inspectedUnit.examples && inspectedUnit.examples.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-2">
                  Authentic Examples
                </h4>
                <div className="space-y-1.5">
                  {inspectedUnit.examples.map((ex, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs text-slate-300">
                      <p className="font-serif text-[13px] leading-relaxed">&ldquo;{ex.sentence}&rdquo;</p>
                      <span className="text-[10px] text-slate-500 block mt-1 font-sans">— {ex.sourceType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Dimensions Radar */}
            <div className="mb-5">
              <DimensionsRadar mastery={inspectedUnit.dimensionsMastery} />
            </div>

            {/* FSRS System Properties */}
            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-3.5 mb-5 text-xs text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>FSRS Due Date:</span>
                <span className="text-slate-200 font-mono">
                  {new Date(inspectedUnit.fsrs.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Stability:</span>
                <span className="text-slate-200 font-mono">{Math.round(inspectedUnit.fsrs.stability * 10) / 10} days</span>
              </div>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className="text-slate-200 font-mono">{Math.round(inspectedUnit.fsrs.difficulty * 10) / 10}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Reps:</span>
                <span className="text-slate-200 font-mono">{inspectedUnit.fsrs.reps} (Lapses: {inspectedUnit.fsrs.lapses})</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleToggleSuspend(inspectedUnit)}
                className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-1.5"
              >
                {inspectedUnit.isSuspended ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unsuspend</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Suspend</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleResetSchedule(inspectedUnit)}
                className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span>Reset FSRS</span>
              </button>

              <button
                onClick={() => handleDeleteUnit(inspectedUnit.id, inspectedUnit.word)}
                className="py-2.5 px-3 rounded-xl border border-rose-800/40 bg-rose-950/30 hover:bg-rose-900/40 text-xs font-semibold text-rose-300 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
