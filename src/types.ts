import { Card as FSRSCard, Rating, State } from 'ts-fsrs';

export type KnowledgeDimension =
  | 'meaning_recall'       // Retrieving definition and core semantic sense
  | 'contextual_usage'     // Producing and comprehending within authentic sentence structures
  | 'chunks_collocations'  // Mastering high-frequency formulaic sequences & collocations
  | 'nuance_distinction'   // Discerning connotation, formality, register, and close synonyms
  | 'active_production';   // Actively generating the lexical item from conceptual prompt

export interface ChunkItem {
  id: string;
  text: string;           // e.g. "shun the limelight"
  meaning: string;        // e.g. "actively avoid public attention or fame"
  example: string;        // e.g. "The reclusive author continued to shun the limelight."
  register?: string;       // e.g. "Formal", "Literary", "Journalistic", "IELTS Band 8+"
}

export type VariantType =
  | 'word_to_meaning'     // Prompt: Word -> Recall definition & register
  | 'meaning_to_word'     // Prompt: Definition + hint -> Produce word
  | 'cloze_context'       // Prompt: Authentic sentence with blank -> Fill in word
  | 'chunk_completion'    // Prompt: High-frequency collocation with blank -> Complete chunk
  | 'nuance_choice';      // Prompt: Multiple choice choosing between close synonyms

export interface CardVariant {
  id: string;
  type: VariantType;
  testedDimension: KnowledgeDimension;
  prompt: string;
  subPrompt?: string;     // Contextual sentence, IPA, or POS cue
  targetAnswer: string;
  options?: string[];     // Used for nuance_choice or multiple choice active recall
  hint?: string;
  explanation: string;
  chunkRefId?: string;
}

export interface VocabularyLearningUnit {
  id: string;
  word: string;
  phonetic: string;       // e.g. "/ʃʌn/"
  partOfSpeech: string;   // e.g. "verb (transitive)"
  cefrLevel: 'B2' | 'C1' | 'C2';
  definition: string;
  nuancedDefinitions?: string[];
  etymology?: string;
  register?: string;       // e.g. "Formal, Academic, Written"
  mnemonic?: string;      // AI memory anchor
  
  // High-priority chunks & native-like collocations
  chunks: ChunkItem[];
  
  // Authentic contextual examples
  examples: {
    sentence: string;
    sourceType: string;   // e.g. "Academic Paper", "The Economist", "Literary"
  }[];

  // Nuance and distinction against close synonyms
  synonyms: {
    word: string;
    nuanceDiff: string;  // e.g. "Avoid is neutral; shun implies deliberate moral/social rejection."
  }[];
  antonyms?: string[];

  // All question variants belonging to this ONE vocabulary unit
  variants: CardVariant[];

  deckId: string;
  tags: string[];

  // Single FSRS schedule for the entire unit
  fsrs: {
    due: string;           // ISO timestamp
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: State;
    last_review?: string;  // ISO timestamp
    learning_steps?: number;
  };

  // Dimensional mastery tracking (0 to 100)
  dimensionsMastery: Record<KnowledgeDimension, number>;

  // Tracking per-variant performance without giving variants separate schedules
  variantStats: Record<string, {
    timesTested: number;
    lastTested: number;
    correctCount: number;
  }>;

  isSuspended?: boolean;
  isStarred?: boolean;
  imageUrl?: string;      // AI generated mnemonic illustration (optional)
  createdAt: number;
  updatedAt: number;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  color: string;
  iconName?: string;
  createdAt: number;
}

export interface ReviewLog {
  id: string;
  unitId: string;
  word: string;
  deckId: string;
  variantId: string;
  variantType: VariantType;
  rating: Rating;
  state: State;
  reviewTime: number;     // Epoch ms
  scheduledDays: number;
  durationSeconds?: number;
}

export interface ReviewSessionCard {
  unit: VocabularyLearningUnit;
  selectedVariant: CardVariant;
  isReinforcement?: boolean; // If failed earlier in session and re-queued
}

export interface StudyDayRecord {
  date: string;              // Local calendar date 'YYYY-MM-DD'
  sessionsCompleted: number;
  cardsReviewed: number;
  updatedAt: number;         // Epoch ms
}

export interface StreakDayDot {
  date: string;              // 'YYYY-MM-DD'
  dayLabel: string;          // e.g. 'Mon', 'Tue'
  shortLabel: string;        // e.g. 'M', 'T', 'W'
  completed: boolean;
  isToday: boolean;
  sessionsCompleted: number;
  cardsReviewed: number;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  totalStudyDays: number;
  lastStudyDate: string | null;
  last7Days: StreakDayDot[];
}

export type ExportScope = 'vocabulary' | 'full';

export interface DailyReminderSettings {
  enabled: boolean;
  reminderTime: string;          // 24-hour local time 'HH:mm', e.g. '19:00'
  lastNotifiedDate: string | null; // 'YYYY-MM-DD'
  dismissedDate: string | null;    // 'YYYY-MM-DD'
}

