import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  Card as FSRSCard,
  RecordLogItem,
} from 'ts-fsrs';
import {
  VocabularyLearningUnit,
  CardVariant,
  KnowledgeDimension,
  ReviewLog,
} from '../types';

// Default FSRS instance
const f = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
});

/**
 * Creates the initial FSRS schedule state for a new Vocabulary Learning Unit.
 */
export function createInitialFSRSState(customDueDate?: Date) {
  const empty = createEmptyCard(customDueDate || new Date());
  return {
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    last_review: empty.last_review ? empty.last_review.toISOString() : undefined,
    learning_steps: empty.learning_steps || 0,
  };
}

/**
 * Creates the default initial dimensional mastery profile.
 */
export function createInitialDimensionsMastery(): Record<KnowledgeDimension, number> {
  return {
    meaning_recall: 20,
    contextual_usage: 15,
    chunks_collocations: 10,
    nuance_distinction: 10,
    active_production: 5,
  };
}

/**
 * Reconstitutes a ts-fsrs Card object from a unit's serialized fsrs property.
 */
export function getFSRSCardFromUnit(unit: VocabularyLearningUnit): FSRSCard {
  return {
    due: new Date(unit.fsrs.due),
    stability: unit.fsrs.stability,
    difficulty: unit.fsrs.difficulty,
    elapsed_days: unit.fsrs.elapsed_days,
    scheduled_days: unit.fsrs.scheduled_days,
    reps: unit.fsrs.reps,
    lapses: unit.fsrs.lapses,
    state: unit.fsrs.state,
    last_review: unit.fsrs.last_review ? new Date(unit.fsrs.last_review) : undefined,
    learning_steps: unit.fsrs.learning_steps || 0,
  };
}

/**
 * Calculates projected next intervals for all four rating buttons (Again, Hard, Good, Easy).
 * Used directly in the review UI so learners can see exactly what each button will do.
 */
export function getProjectedIntervals(unit: VocabularyLearningUnit, now: Date = new Date()) {
  const card = getFSRSCardFromUnit(unit);
  const repeatResults = f.repeat(card, now);

  return {
    [Rating.Again]: {
      card: repeatResults[Rating.Again].card,
      label: formatInterval(repeatResults[Rating.Again].card.scheduled_days, repeatResults[Rating.Again].card.due, now),
    },
    [Rating.Hard]: {
      card: repeatResults[Rating.Hard].card,
      label: formatInterval(repeatResults[Rating.Hard].card.scheduled_days, repeatResults[Rating.Hard].card.due, now),
    },
    [Rating.Good]: {
      card: repeatResults[Rating.Good].card,
      label: formatInterval(repeatResults[Rating.Good].card.scheduled_days, repeatResults[Rating.Good].card.due, now),
    },
    [Rating.Easy]: {
      card: repeatResults[Rating.Easy].card,
      label: formatInterval(repeatResults[Rating.Easy].card.scheduled_days, repeatResults[Rating.Easy].card.due, now),
    },
  };
}

/**
 * Formats an interval into a concise mobile-friendly string (e.g., '10m', '1.2d', '3w', '2mo').
 */
export function formatInterval(scheduledDays: number, due: Date, now: Date): string {
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return 'Immediate';
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  const days = Math.round((diffHours / 24) * 10) / 10;
  if (days < 30) {
    return `${days % 1 === 0 ? days.toFixed(0) : days.toFixed(1)}d`;
  }
  const months = Math.round((days / 30) * 10) / 10;
  if (months < 12) {
    return `${months % 1 === 0 ? months.toFixed(0) : months.toFixed(1)}mo`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return `${years % 1 === 0 ? years.toFixed(0) : years.toFixed(1)}y`;
}

/**
 * CRITICAL RULE: ADAPTIVE VARIANT SELECTION
 * Selects the optimal CardVariant for the unit based on:
 * 1. The unit's weakest knowledge dimension.
 * 2. Least recently tested variant to prevent visual repetition.
 * 3. Fallback to word_to_meaning if new.
 */
export function selectAdaptiveVariant(unit: VocabularyLearningUnit): CardVariant {
  if (!unit.variants || unit.variants.length === 0) {
    // Fallback minimal variant
    return {
      id: `${unit.id}_fallback`,
      type: 'word_to_meaning',
      testedDimension: 'meaning_recall',
      prompt: unit.word,
      subPrompt: unit.phonetic ? `${unit.phonetic} • ${unit.partOfSpeech}` : unit.partOfSpeech,
      targetAnswer: unit.definition,
      explanation: unit.examples[0]?.sentence || unit.definition,
    };
  }

  // If the unit is brand new (reps === 0), start with Word -> Meaning or Chunk Completion
  if (unit.fsrs.reps === 0) {
    const defaultVariant = unit.variants.find((v) => v.type === 'word_to_meaning') || unit.variants[0];
    return defaultVariant;
  }

  const now = Date.now();
  const mastery = unit.dimensionsMastery || createInitialDimensionsMastery();
  const stats = unit.variantStats || {};

  // Rank variants by:
  // - Dimension weakness (lower mastery score = higher priority)
  // - Staleness (longer time since tested = higher priority)
  const scoredVariants = unit.variants.map((v) => {
    const dimScore = mastery[v.testedDimension] ?? 50; // 0 to 100
    const varStat = stats[v.id];
    const daysSinceTested = varStat ? (now - varStat.lastTested) / (1000 * 60 * 60 * 24) : 999;
    const testCount = varStat?.timesTested || 0;

    // Priority Score formula: Lower dimScore raises priority, high staleness raises priority
    const priorityScore = (100 - dimScore) * 1.5 + Math.min(daysSinceTested * 10, 80) - testCount * 5;

    return {
      variant: v,
      priorityScore,
    };
  });

  // Sort descending by priority score
  scoredVariants.sort((a, b) => b.priorityScore - a.priorityScore);

  return scoredVariants[0].variant;
}

/**
 * Applies a review rating to the unit:
 * - Updates the ONE primary FSRS state for the entire Vocabulary Learning Unit.
 * - Updates the dimensional mastery score for the tested dimension.
 * - Records variant testing statistics.
 */
export function processUnitReview(
  unit: VocabularyLearningUnit,
  variant: CardVariant,
  rating: Rating,
  reviewTime: Date = new Date(),
  durationSeconds: number = 5
): {
  updatedUnit: VocabularyLearningUnit;
  reviewLog: ReviewLog;
} {
  const currentCard = getFSRSCardFromUnit(unit);
  const repeatResults = f.repeat(currentCard, reviewTime);
  const nextItem: RecordLogItem = repeatResults[rating];
  const newCard = nextItem.card;

  // Update dimensional mastery
  const mastery = { ...(unit.dimensionsMastery || createInitialDimensionsMastery()) };
  const dim = variant.testedDimension;
  const currentDimScore = mastery[dim] ?? 30;

  let delta = 0;
  if (rating === Rating.Again) {
    delta = -15;
  } else if (rating === Rating.Hard) {
    delta = 3;
  } else if (rating === Rating.Good) {
    delta = 10;
  } else if (rating === Rating.Easy) {
    delta = 18;
  }

  mastery[dim] = Math.max(0, Math.min(100, currentDimScore + delta));

  // If this was an Easy or Good rating on chunk completion or cloze, bump contextual usage too
  if (rating >= Rating.Good && (variant.type === 'chunk_completion' || variant.type === 'cloze_context')) {
    mastery.contextual_usage = Math.min(100, (mastery.contextual_usage || 20) + 5);
  }

  // Update variant stats
  const variantStats = { ...(unit.variantStats || {}) };
  const currentVStat = variantStats[variant.id] || { timesTested: 0, lastTested: 0, correctCount: 0 };

  variantStats[variant.id] = {
    timesTested: currentVStat.timesTested + 1,
    lastTested: reviewTime.getTime(),
    correctCount: currentVStat.correctCount + (rating >= Rating.Good ? 1 : 0),
  };

  const updatedUnit: VocabularyLearningUnit = {
    ...unit,
    fsrs: {
      due: newCard.due.toISOString(),
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      reps: newCard.reps,
      lapses: newCard.lapses,
      state: newCard.state,
      last_review: reviewTime.toISOString(),
      learning_steps: newCard.learning_steps,
    },
    dimensionsMastery: mastery,
    variantStats,
    updatedAt: reviewTime.getTime(),
  };

  const reviewLog: ReviewLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    unitId: unit.id,
    word: unit.word,
    deckId: unit.deckId,
    variantId: variant.id,
    variantType: variant.type,
    rating,
    state: currentCard.state,
    reviewTime: reviewTime.getTime(),
    scheduledDays: newCard.scheduled_days,
    durationSeconds,
  };

  return { updatedUnit, reviewLog };
}
