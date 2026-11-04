import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  Sparkles,
  Award,
  ArrowLeft,
  BookOpen,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  LayoutDashboard,
  Flame,
} from 'lucide-react';
import { Rating } from 'ts-fsrs';
import { VocabularyLearningUnit, CardVariant, ReviewLog, Deck, StreakSummary } from '../types';
import {
  selectAdaptiveVariant,
  getProjectedIntervals,
  processUnitReview,
} from '../engine/scheduler';
import { db, recordCompletedStudySession } from '../db';
import { DimensionsRadar } from './DimensionsRadar';
import { useSpeech } from '../hooks/useSpeech';

interface StudySessionProps {
  initialUnits: VocabularyLearningUnit[];
  decks: Deck[];
  selectedDeckId?: string;
  onSessionFinish: () => void;
  onBackToDashboard?: () => void;
}

export const StudySession: React.FC<StudySessionProps> = ({
  initialUnits,
  decks,
  onSessionFinish,
  onBackToDashboard = onSessionFinish,
}) => {
  const { speak, isPlaying } = useSpeech();

  // Active queue of units to review in this session
  const [queue, setQueue] = useState<VocabularyLearningUnit[]>(initialUnits);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [userTypedInput, setUserTypedInput] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [sessionStartTime] = useState<number>(Date.now());
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [immediateReinforcementCount, setImmediateReinforcementCount] = useState<number>(0);
  const [completedStreak, setCompletedStreak] = useState<StreakSummary | null>(null);
  const hasRecordedSessionRef = useRef<boolean>(false);

  // Current Unit & its adaptively selected variant
  const currentUnit: VocabularyLearningUnit | undefined = queue[currentIndex];

  const currentVariant: CardVariant | undefined = useMemo(() => {
    if (!currentUnit) return undefined;
    return selectAdaptiveVariant(currentUnit);
  }, [currentUnit]);

  // Next projected intervals for current unit
  const projectedIntervals = useMemo(() => {
    if (!currentUnit) return null;
    return getProjectedIntervals(currentUnit);
  }, [currentUnit]);

  // Reset inputs on card transition
  useEffect(() => {
    setIsAnswerRevealed(false);
    setUserTypedInput('');
    setSelectedOption(null);
    setCardStartTime(Date.now());
  }, [currentIndex, currentUnit?.id]);

  // Record daily streak and launch confetti celebration when session completes
  useEffect(() => {
    if (queue.length > 0 && currentIndex >= queue.length && !hasRecordedSessionRef.current) {
      hasRecordedSessionRef.current = true;
      recordCompletedStudySession(reviewLogs.length || queue.length)
        .then((summary) => setCompletedStreak(summary))
        .catch((err) => console.error('Failed to record study session streak:', err));

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback
      }
    }
  }, [currentIndex, queue.length, reviewLogs.length]);

  const deckName = useMemo(() => {
    if (!currentUnit) return 'Vocabulary';
    const found = decks.find((d) => d.id === currentUnit.deckId);
    return found ? found.name : 'Lexicon';
  }, [currentUnit, decks]);

  // Handle rating answer
  const handleRating = useCallback(
    async (rating: Rating) => {
      if (!currentUnit || !currentVariant) return;

      const durationSec = Math.max(1, Math.round((Date.now() - cardStartTime) / 1000));
      const { updatedUnit, reviewLog } = processUnitReview(
        currentUnit,
        currentVariant,
        rating,
        new Date(),
        durationSec
      );

      // Save to IndexedDB
      await db.units.put(updatedUnit);
      await db.reviewLogs.put(reviewLog);
      setReviewLogs((prev) => [...prev, reviewLog]);

      // Immediate Reinforcement Logic:
      // If user rated Again or Hard, push unit to end of session queue for immediate reinforcement!
      if (rating === Rating.Again || rating === Rating.Hard) {
        setQueue((prev) => [...prev, updatedUnit]);
        setImmediateReinforcementCount((prev) => prev + 1);
      }

      setCurrentIndex((prev) => prev + 1);
    },
    [currentUnit, currentVariant, cardStartTime]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && !isAnswerRevealed) {
          setIsAnswerRevealed(true);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsAnswerRevealed((prev) => !prev);
      } else if (isAnswerRevealed) {
        if (e.key === '1') handleRating(Rating.Again);
        else if (e.key === '2') handleRating(Rating.Hard);
        else if (e.key === '3') handleRating(Rating.Good);
        else if (e.key === '4') handleRating(Rating.Easy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerRevealed, handleRating]);

  // All cards completed
  if (!currentUnit || currentIndex >= queue.length) {
    const totalReviews = reviewLogs.length;
    const goodEasyCount = reviewLogs.filter((l) => l.rating >= Rating.Good).length;
    const retentionRate = totalReviews > 0 ? Math.round((goodEasyCount / totalReviews) * 100) : 100;
    const durationMin = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));

    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-white text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-sky-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-6">
          <Award className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-2">Session Complete!</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
          All due vocabulary items have been reinforced and updated in your FSRS schedule.
        </p>

        {/* Streak Confirmation Badge */}
        {completedStreak && (
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-6">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>
              {completedStreak.currentStreak}{' '}
              {completedStreak.currentStreak === 1 ? 'Day Streak' : 'Days Streak'} Active — Today&apos;s session recorded!
            </span>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-2xl font-bold text-sky-400">{totalReviews}</div>
            <div className="text-[11px] text-slate-400 mt-1">Cards Reviewed</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-2xl font-bold text-emerald-400">{retentionRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Session Retention</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-2xl font-bold text-indigo-400">{durationMin}m</div>
            <div className="text-[11px] text-slate-400 mt-1">Active Study</div>
          </div>
        </div>

        {immediateReinforcementCount > 0 && (
          <div className="flex items-center justify-center gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 mb-8">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>
              <strong>{immediateReinforcementCount}</strong> weak variants were reinforced immediately during this session.
            </span>
          </div>
        )}

        <button
          id="btn-return-home"
          onClick={onSessionFinish}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold text-sm shadow-xl shadow-indigo-500/25 transition active:scale-98 flex items-center justify-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }

  // Variant helper label & badge color
  const variantBadge = {
    word_to_meaning: { label: 'Word → Meaning', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    meaning_to_word: { label: 'Active Production', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    cloze_context: { label: 'Contextual Cloze', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    chunk_completion: { label: 'Chunk Completion', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    nuance_choice: { label: 'Nuance Discrimination', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  }[currentVariant?.type || 'word_to_meaning'];

  const progressPercent = Math.round(((currentIndex) / queue.length) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* Navigation & Progress Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          id="btn-session-exit-dashboard"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-sm"
          title="Exit active session and return to dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-slate-200 font-semibold">{deckName}</span>
          <span className="text-slate-600">•</span>
          <span className="font-mono">{currentIndex + 1} / {queue.length}</span>
        </div>
      </div>

      {/* Top Session Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Card #{currentUnit.fsrs.reps + 1}</span>
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">
            {progressPercent}% completed
          </span>
        </div>
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-purple-500 transition-all duration-300"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Main Flashcard Container */}
      <div
        id="card-container"
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 mb-5 transition-all"
      >
        {/* Card Header Tags */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${variantBadge.color}`}>
              {variantBadge.label}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {currentUnit.cefrLevel}
            </span>
          </div>

          <button
            id="btn-speak-word"
            onClick={() => speak(currentUnit.word)}
            title="Listen to pronunciation"
            className={`p-2 rounded-full border border-slate-700/80 hover:border-sky-500 transition ${
              isPlaying ? 'bg-sky-500/20 text-sky-400 animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* QUESTION PROMPT AREA */}
        <div className="min-h-[140px] flex flex-col justify-center my-2">
          {/* SubPrompt Context (if any) */}
          {currentVariant?.subPrompt && (
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              {currentVariant.subPrompt}
            </p>
          )}

          {/* Main Prompt */}
          {currentVariant?.type === 'word_to_meaning' ? (
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-1">
                {currentVariant.prompt}
              </h2>
              {currentUnit.phonetic && (
                <p className="text-sm font-mono text-sky-400/90">{currentUnit.phonetic}</p>
              )}
            </div>
          ) : currentVariant?.type === 'chunk_completion' ? (
            <div>
              <div className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>High-Frequency Native Chunk</span>
              </div>
              <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
                {currentVariant.prompt.split('_____').map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <span className="inline-block px-2 py-0.5 mx-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                        {isAnswerRevealed ? currentUnit.word : '_____'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            </div>
          ) : currentVariant?.type === 'cloze_context' ? (
            <div>
              <div className="text-xs font-semibold text-indigo-400 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Authentic Sentence Cloze</span>
              </div>
              <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
                {currentVariant.prompt.split('_____').map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <span className="inline-block px-2 py-0.5 mx-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                        {isAnswerRevealed ? currentUnit.word : '_____'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            </div>
          ) : currentVariant?.type === 'meaning_to_word' ? (
            <div>
              <p className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed mb-3">
                &ldquo;{currentVariant.prompt}&rdquo;
              </p>
              {currentVariant.hint && !isAnswerRevealed && (
                <p className="text-xs text-slate-400 flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 w-fit">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Hint: {currentVariant.hint}</span>
                </p>
              )}
            </div>
          ) : (
            // nuance_choice
            <div>
              <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed mb-3">
                {currentVariant?.prompt}
              </p>
            </div>
          )}

          {/* Interactive Multiple Choice options (if nuance_choice variant) */}
          {currentVariant?.type === 'nuance_choice' && currentVariant.options && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {currentVariant.options.map((opt) => {
                const isCorrect = opt.toLowerCase() === currentVariant.targetAnswer.toLowerCase();
                const isSelected = selectedOption === opt;
                let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600';

                if (isAnswerRevealed) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 line-through';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-sky-500/20 border-sky-500 text-sky-200';
                }

                return (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedOption(opt);
                      if (!isAnswerRevealed) setIsAnswerRevealed(true);
                    }}
                    disabled={isAnswerRevealed}
                    className={`p-3 rounded-xl border text-sm font-medium transition active:scale-98 text-left ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Optional typing input for Cloze / Meaning to Word */}
          {!isAnswerRevealed &&
            (currentVariant?.type === 'meaning_to_word' ||
              currentVariant?.type === 'cloze_context' ||
              currentVariant?.type === 'chunk_completion') && (
              <div className="mt-4">
                <input
                  id="input-vocab-recall"
                  type="text"
                  value={userTypedInput}
                  onChange={(e) => setUserTypedInput(e.target.value)}
                  placeholder="Type target word (optional)..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-sky-500 transition"
                  autoComplete="off"
                  autoCapitalize="none"
                />
              </div>
            )}
        </div>

        {/* REVEAL BUTTON (if not yet revealed) */}
        {!isAnswerRevealed ? (
          <button
            id="btn-reveal-answer"
            onClick={() => setIsAnswerRevealed(true)}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Show Complete Answer</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          /* DEEP LEARNING MATERIAL (Revealed Answer Side) */
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Target Word & Phonetic Banner */}
            <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">{currentUnit.word}</h3>
                  <span className="text-xs text-slate-400 font-mono">{currentUnit.phonetic}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentUnit.partOfSpeech}</p>
              </div>
              <button
                onClick={() => speak(currentUnit.word)}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear</span>
              </button>
            </div>

            {/* Primary & Nuanced Definitions */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Core Meaning
              </h4>
              <p className="text-sm font-medium text-slate-100 leading-relaxed">
                {currentUnit.definition}
              </p>
              {currentUnit.nuancedDefinitions && currentUnit.nuancedDefinitions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {currentUnit.nuancedDefinitions.map((nuance, idx) => (
                    <p key={idx} className="text-xs text-slate-400 pl-3 border-l border-slate-700">
                      {nuance}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* HIGH-FREQUENCY CHUNKS (Crucial Feature) */}
            {currentUnit.chunks && currentUnit.chunks.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>High-Frequency Chunks & Collocations</span>
                </h4>
                <div className="space-y-2">
                  {currentUnit.chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 hover:border-purple-600/60 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-purple-200 tracking-tight">
                          {chunk.text}
                        </span>
                        <button
                          onClick={() => speak(chunk.text)}
                          title="Listen to chunk"
                          className="text-purple-400 hover:text-purple-300 p-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{chunk.meaning}</p>
                      {chunk.example && (
                        <p className="text-[11px] text-slate-400 italic mt-1 font-serif">
                          &ldquo;{chunk.example}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Authentic Sentences */}
            {currentUnit.examples && currentUnit.examples.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
                  Authentic Contexts
                </h4>
                <div className="space-y-2">
                  {currentUnit.examples.map((ex, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
                      <p className="font-serif text-[13px] leading-relaxed text-slate-200">
                        &ldquo;{ex.sentence}&rdquo;
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">— {ex.sourceType}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuance & Synonyms */}
            {currentUnit.synonyms && currentUnit.synonyms.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  Nuance & Synonym Distinctions
                </h4>
                <div className="space-y-1.5">
                  {currentUnit.synonyms.map((syn, idx) => (
                    <div key={idx} className="text-xs bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-amber-300">{syn.word}:</span>{' '}
                      <span className="text-slate-300">{syn.nuanceDiff}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mnemonic / Cognitive Hook */}
            {currentUnit.mnemonic && (
              <div className="bg-indigo-950/30 border border-indigo-800/40 p-3 rounded-xl text-xs">
                <span className="font-bold text-indigo-300 block mb-0.5">Cognitive Mnemonic Anchor:</span>
                <span className="text-slate-300">{currentUnit.mnemonic}</span>
              </div>
            )}

            {/* Knowledge Dimensions Radar Mini-View */}
            <div className="pt-2">
              <DimensionsRadar
                mastery={currentUnit.dimensionsMastery}
                activeDimension={currentVariant?.testedDimension}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* RATING BUTTONS (FSRS RATING BAR) */}
      {isAnswerRevealed && projectedIntervals && (
        <div className="fixed bottom-16 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 p-3 px-4 pb-4">
          <div className="max-w-xl mx-auto grid grid-cols-4 gap-2 sm:gap-3">
            {/* Rating 1: Again */}
            <button
              id="btn-rating-again"
              onClick={() => handleRating(Rating.Again)}
              className="flex flex-col items-center justify-center p-2.5 sm:py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95 transition"
            >
              <span className="text-xs font-bold text-rose-400">Again</span>
              <span className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                {projectedIntervals[Rating.Again].label}
              </span>
            </button>

            {/* Rating 2: Hard */}
            <button
              id="btn-rating-hard"
              onClick={() => handleRating(Rating.Hard)}
              className="flex flex-col items-center justify-center p-2.5 sm:py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 transition"
            >
              <span className="text-xs font-bold text-amber-400">Hard</span>
              <span className="text-[10px] text-amber-300/80 font-mono mt-0.5">
                {projectedIntervals[Rating.Hard].label}
              </span>
            </button>

            {/* Rating 3: Good */}
            <button
              id="btn-rating-good"
              onClick={() => handleRating(Rating.Good)}
              className="flex flex-col items-center justify-center p-2.5 sm:py-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 active:scale-95 transition"
            >
              <span className="text-xs font-bold text-sky-400">Good</span>
              <span className="text-[10px] text-sky-300/80 font-mono mt-0.5">
                {projectedIntervals[Rating.Good].label}
              </span>
            </button>

            {/* Rating 4: Easy */}
            <button
              id="btn-rating-easy"
              onClick={() => handleRating(Rating.Easy)}
              className="flex flex-col items-center justify-center p-2.5 sm:py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition"
            >
              <span className="text-xs font-bold text-emerald-400">Easy</span>
              <span className="text-[10px] text-emerald-300/80 font-mono mt-0.5">
                {projectedIntervals[Rating.Easy].label}
              </span>
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">
            Shortcuts: [1] Again • [2] Hard • [3] Good • [4] Easy • [Space] Reveal
          </p>
        </div>
      )}
    </div>
  );
};
