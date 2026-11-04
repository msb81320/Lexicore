import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Image as ImageIcon,
  Volume2,
  Check,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Deck, VocabularyLearningUnit } from '../types';
import { db } from '../db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSpeech } from '../hooks/useSpeech';

interface AddVocabularyProps {
  decks: Deck[];
  onUnitsAdded: () => void;
  onNavigateToBrowser: () => void;
  onBackToDashboard?: () => void;
}

export const AddVocabulary: React.FC<AddVocabularyProps> = ({
  decks,
  onUnitsAdded,
  onNavigateToBrowser,
  onBackToDashboard,
}) => {
  const isOnline = useOnlineStatus();
  const { speak } = useSpeech();

  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [singleWord, setSingleWord] = useState('');
  const [batchText, setBatchText] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || 'deck_ielts_master');
  const [selectedCefr, setSelectedCefr] = useState<'B2' | 'C1' | 'C2'>('C1');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedUnits, setGeneratedUnits] = useState<VocabularyLearningUnit[]>([]);
  const [generatingImageForId, setGeneratingImageForId] = useState<string | null>(null);

  // Suggestions for quick add
  const quickSuggestions = [
    'ubiquitous',
    'ephemeral',
    'pragmatic',
    'ameliorate',
    'fastidious',
    'equivocal',
    'mitigate',
    'lucid',
    'serendipity',
    'superfluous',
    'taciturn',
    'tenacious',
  ];

  const handleGenerate = async () => {
    setErrorMsg(null);

    let wordsToProcess: string[] = [];
    if (inputMode === 'single') {
      if (!singleWord.trim()) {
        setErrorMsg('Please enter an English word or phrase.');
        return;
      }
      wordsToProcess = [singleWord.trim()];
    } else {
      wordsToProcess = batchText
        .split(/[\n,]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      if (wordsToProcess.length === 0) {
        setErrorMsg('Please enter at least one word in the batch box.');
        return;
      }
    }

    if (!isOnline) {
      setErrorMsg('An active internet connection is required for AI vocabulary generation. Your existing vocabulary can be reviewed 100% offline.');
      return;
    }

    setIsGenerating(true);
    setGeneratingStep('Initializing Gemini AI lexicographer...');

    try {
      setGeneratingStep(`Synthesizing high-frequency chunks & authentic contexts for ${wordsToProcess.length} item(s)...`);

      const response = await fetch('/api/generate-vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: wordsToProcess,
          deckId: selectedDeckId,
          targetLevel: selectedCefr,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate vocabulary.');
      }

      setGeneratingStep('Validating schema and formulating adaptive variants...');
      setGeneratedUnits(data.units);
      setGeneratingStep('');
    } catch (err: unknown) {
      console.error('Generation error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error during AI generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (generatedUnits.length === 0) return;
    try {
      await db.units.bulkPut(generatedUnits);
      onUnitsAdded();
      setGeneratedUnits([]);
      setSingleWord('');
      setBatchText('');
      onNavigateToBrowser();
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg('Failed to save to local IndexedDB.');
    }
  };

  const handleGenerateMnemonicImage = async (unit: VocabularyLearningUnit) => {
    setGeneratingImageForId(unit.id);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: unit.word,
          prompt: `A clean, minimalist vector aesthetic mnemonic artwork for English word "${unit.word}" (${unit.definition}). Rich slate and vibrant indigo palette.`,
          imageSize: '1K',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Image generation failed');
      }

      const updated = { ...unit, imageUrl: data.imageUrl };
      setGeneratedUnits((prev) => prev.map((u) => (u.id === unit.id ? updated : u)));
    } catch (err: unknown) {
      console.error('Image generation error:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImageForId(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <div className="mb-4">
          <button
            id="btn-add-back-dashboard"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Return to Home Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>AI Lexicography Engine</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Add Vocabulary Units</h2>
        <p className="text-xs text-slate-400 mt-1">
          Generates 1 Vocabulary Learning Unit with FSRS schedule, authentic chunks, and multiple testing variants.
        </p>
      </div>

      {/* Input Mode Selector */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl mb-4">
        <button
          id="tab-single-mode"
          onClick={() => setInputMode('single')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            inputMode === 'single'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Single Word
        </button>
        <button
          id="tab-batch-mode"
          onClick={() => setInputMode('batch')}
          className={`py-2 text-xs font-semibold rounded-xl transition ${
            inputMode === 'batch'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Batch List (up to 5)
        </button>
      </div>

      {/* Configuration Settings (Deck & CEFR) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Target Deck
          </label>
          <select
            id="select-target-deck"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            CEFR Target Level
          </label>
          <select
            id="select-target-cefr"
            value={selectedCefr}
            onChange={(e) => setSelectedCefr(e.target.value as 'B2' | 'C1' | 'C2')}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="B2">B2 (Upper Intermediate)</option>
            <option value="C1">C1 (Advanced Academic)</option>
            <option value="C2">C2 (Mastery / Literary)</option>
          </select>
        </div>
      </div>

      {/* Input Field */}
      {inputMode === 'single' ? (
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            English Word or Expression
          </label>
          <div className="relative">
            <input
              id="input-single-word"
              type="text"
              value={singleWord}
              onChange={(e) => setSingleWord(e.target.value)}
              placeholder="e.g. ubiquitous, ephemeral, shun..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-medium transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating) handleGenerate();
              }}
            />
          </div>

          {/* Quick Suggestions */}
          <div className="mt-2.5">
            <span className="text-[10px] text-slate-500 font-semibold block mb-1">Quick ideas:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickSuggestions.slice(0, 6).map((word) => (
                <button
                  key={word}
                  onClick={() => setSingleWord(word)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition"
                >
                  +{word}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Batch Vocabulary (Comma or line separated)
          </label>
          <textarea
            id="textarea-batch-words"
            rows={4}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder="pragmatic&#10;ameliorate&#10;fastidious&#10;equivocal&#10;mitigate"
            className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 font-mono transition"
          />
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generate Action Button */}
      <button
        id="btn-generate-ai"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-indigo-500/20 transition active:scale-98 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>{generatingStep || 'Generating Material...'}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-sky-300" />
            <span>Generate Learning Units</span>
          </>
        )}
      </button>

      {/* PREVIEW OF GENERATED UNITS */}
      {generatedUnits.length > 0 && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Generated Units Ready ({generatedUnits.length})</span>
            </h3>
            <button
              id="btn-save-all-units"
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Add to Deck</span>
            </button>
          </div>

          <div className="space-y-3">
            {generatedUnits.map((unit) => (
              <div
                key={unit.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-white">{unit.word}</h4>
                      <span className="text-xs text-sky-400 font-mono">{unit.phonetic}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {unit.cefrLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{unit.partOfSpeech}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => speak(unit.word)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleGenerateMnemonicImage(unit)}
                      disabled={generatingImageForId === unit.id}
                      title="Generate visual mnemonic illustration with Gemini"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition"
                    >
                      {generatingImageForId === unit.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Generated Mnemonic Image (if generated) */}
                {unit.imageUrl && (
                  <div className="my-3 rounded-xl overflow-hidden border border-slate-700/60 max-h-48">
                    <img
                      src={unit.imageUrl}
                      alt={unit.word}
                      className="w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Definition */}
                <p className="text-xs font-medium text-slate-300 leading-relaxed mb-3">
                  {unit.definition}
                </p>

                {/* Chunks */}
                {unit.chunks && unit.chunks.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                      Key Native Chunks ({unit.chunks.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {unit.chunks.map((c) => (
                        <span
                          key={c.id}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-950/40 text-purple-200 border border-purple-800/40"
                        >
                          {c.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Variants count */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>
                    Variants created: <strong>{unit.variants.length}</strong> (Word→Meaning, Production, Cloze, Chunks)
                  </span>
                  <span className="text-emerald-400 font-semibold">1 FSRS Schedule</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveAll}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition active:scale-98 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save All to IndexedDB & Start Studying</span>
          </button>
        </div>
      )}
    </div>
  );
};
