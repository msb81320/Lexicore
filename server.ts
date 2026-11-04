import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Zod Validation Schemas
const ChunkSchema = z.object({
  text: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().min(1),
  register: z.string().optional().default('Academic / High-frequency'),
});

const ExampleSchema = z.object({
  sentence: z.string().min(1),
  sourceType: z.string().optional().default('Authentic Context'),
});

const SynonymSchema = z.object({
  word: z.string().min(1),
  nuanceDiff: z.string().min(1),
});

const CardVariantSchema = z.object({
  type: z.enum(['word_to_meaning', 'meaning_to_word', 'cloze_context', 'chunk_completion', 'nuance_choice']),
  testedDimension: z.enum(['meaning_recall', 'contextual_usage', 'chunks_collocations', 'nuance_distinction', 'active_production']),
  prompt: z.string().min(1),
  subPrompt: z.string().optional().default(''),
  targetAnswer: z.string().min(1),
  options: z.array(z.string()).optional(),
  hint: z.string().optional(),
  explanation: z.string().min(1),
});

const VocabUnitResultSchema = z.object({
  word: z.string().min(1),
  phonetic: z.string().default(''),
  partOfSpeech: z.string().default('noun'),
  cefrLevel: z.enum(['B2', 'C1', 'C2']).default('C1'),
  definition: z.string().min(1),
  nuancedDefinitions: z.array(z.string()).optional().default([]),
  etymology: z.string().optional().default(''),
  register: z.string().optional().default('Formal / Academic'),
  mnemonic: z.string().optional().default(''),
  chunks: z.array(ChunkSchema).min(1),
  examples: z.array(ExampleSchema).min(1),
  synonyms: z.array(SynonymSchema).optional().default([]),
  antonyms: z.array(z.string()).optional().default([]),
  variants: z.array(CardVariantSchema).min(3),
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

/**
 * POST /api/generate-vocab
 * Accepts { words: string[], deckId?: string, targetLevel?: string }
 * Returns structured vocabulary learning units with multiple variants
 */
app.post('/api/generate-vocab', async (req, res) => {
  try {
    const { words, deckId = 'deck_ielts_master', targetLevel = 'C1' } = req.body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of one or more English words.' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the environment. Please add it to your environment variables or Settings.',
      });
    }

    const sanitizedWords = words
      .map((w: unknown) => (typeof w === 'string' ? w.trim() : ''))
      .filter((w) => w.length > 0)
      .slice(0, 5); // Limit batch to 5 items for performance and rate limit stability

    const results = [];

    for (const rawWord of sanitizedWords) {
      const prompt = `You are a premier lexicographer, IELTS examiner, and cognitive spaced-repetition specialist.
Generate a comprehensive, high-quality Vocabulary Learning Unit for the English word/phrase: "${rawWord}".

Target CEFR level: ${targetLevel} (B2, C1, or C2).

CRITICAL REQUIREMENTS:
1. "chunks": Provide 2 to 4 high-frequency, native-like chunks / collocations (e.g. for "shun" -> "shun the limelight", "shun public scrutiny").
2. "examples": Provide 2 or 3 authentic contextual sentences (Academic, Journalistic, Literary).
3. "synonyms": Provide 2 or 3 near-synonyms WITH precise nuance distinctions explaining why this word differs.
4. "variants": Generate at least 4 distinct CardVariants testing the SAME vocabulary item:
   - "word_to_meaning" (testedDimension: "meaning_recall")
   - "meaning_to_word" (testedDimension: "active_production")
   - "cloze_context" (testedDimension: "contextual_usage"): authentic sentence with the word blanked out as "_____"
   - "chunk_completion" (testedDimension: "chunks_collocations"): high-frequency chunk with missing target word
   - "nuance_choice" (testedDimension: "nuance_distinction", optional 5th): multiple choice distinguishing subtle register or synonym difference with 4 "options" array.

Return ONLY valid JSON matching this schema:
{
  "word": "${rawWord.toLowerCase()}",
  "phonetic": "/.../",
  "partOfSpeech": "transitive verb | noun | adjective | etc.",
  "cefrLevel": "${targetLevel}",
  "definition": "Clear, precise primary definition",
  "nuancedDefinitions": ["secondary sense"],
  "etymology": "Brief root origin",
  "register": "Formal / Academic / etc.",
  "mnemonic": "Memorable cognitive hook or visual metaphor",
  "chunks": [
    { "text": "...", "meaning": "...", "example": "...", "register": "..." }
  ],
  "examples": [
    { "sentence": "...", "sourceType": "..." }
  ],
  "synonyms": [
    { "word": "...", "nuanceDiff": "..." }
  ],
  "antonyms": ["..."],
  "variants": [
    {
      "type": "word_to_meaning",
      "testedDimension": "meaning_recall",
      "prompt": "${rawWord.toLowerCase()}",
      "subPrompt": "verb • /.../",
      "targetAnswer": "...",
      "explanation": "..."
    },
    {
      "type": "meaning_to_word",
      "testedDimension": "active_production",
      "prompt": "...",
      "subPrompt": "... letters • Part of speech",
      "targetAnswer": "${rawWord.toLowerCase()}",
      "hint": "...",
      "explanation": "..."
    },
    {
      "type": "cloze_context",
      "testedDimension": "contextual_usage",
      "prompt": "Authentic sentence with _____ blank",
      "subPrompt": "Fill in the blank with the appropriate word",
      "targetAnswer": "${rawWord.toLowerCase()}",
      "hint": "...",
      "explanation": "..."
    },
    {
      "type": "chunk_completion",
      "testedDimension": "chunks_collocations",
      "prompt": "native chunk with _____ blank",
      "subPrompt": "Complete the native collocation",
      "targetAnswer": "${rawWord.toLowerCase()}",
      "hint": "...",
      "explanation": "..."
    }
  ]
}`;

      // Use gemini-3.6-flash for structured JSON generation
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text || '{}';
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.error('Failed to parse JSON from model:', responseText);
        throw new Error(`Model returned malformed JSON for word "${rawWord}".`);
      }

      // Validate with Zod
      const validated = VocabUnitResultSchema.parse(parsedJson);

      // Generate complete client unit with ID, timestamps, and initial FSRS card
      const unitId = `unit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowTime = Date.now();

      const unit = {
        id: unitId,
        word: validated.word,
        phonetic: validated.phonetic,
        partOfSpeech: validated.partOfSpeech,
        cefrLevel: validated.cefrLevel,
        definition: validated.definition,
        nuancedDefinitions: validated.nuancedDefinitions,
        etymology: validated.etymology,
        register: validated.register,
        mnemonic: validated.mnemonic,
        chunks: validated.chunks.map((c, i) => ({
          ...c,
          id: `chunk_${unitId}_${i}`,
        })),
        examples: validated.examples,
        synonyms: validated.synonyms,
        antonyms: validated.antonyms,
        variants: validated.variants.map((v, i) => ({
          ...v,
          id: `var_${unitId}_${i}`,
        })),
        deckId,
        tags: [validated.cefrLevel.toLowerCase(), 'ai-generated'],
        // Initial FSRS State (Due now)
        fsrs: {
          due: new Date().toISOString(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 0, // State.New
        },
        dimensionsMastery: {
          meaning_recall: 20,
          contextual_usage: 15,
          chunks_collocations: 10,
          nuance_distinction: 10,
          active_production: 5,
        },
        variantStats: {},
        createdAt: nowTime,
        updatedAt: nowTime,
      };

      results.push(unit);
    }

    res.json({ units: results });
  } catch (err: unknown) {
    console.error('Error generating vocabulary:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error during AI generation';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/generate-image
 * Optional visual mnemonic generation for vocabulary using gemini-3.1-flash-image
 */
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, word, imageSize = '1K' } = req.body;
    if (!prompt && !word) {
      return res.status(400).json({ error: 'Prompt or word is required.' });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const finalPrompt = prompt || `A clear, elegant, minimalist artistic visual mnemonic illustration representing the English vocabulary word "${word}". Clean composition, modern vector aesthetic, rich contrast.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: imageSize === '2K' || imageSize === '4K' ? imageSize : '1K',
        },
      },
    });

    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image data returned from model.' });
    }

    res.json({ imageUrl });
  } catch (err: unknown) {
    console.error('Image generation error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to generate visual mnemonic';
    res.status(500).json({ error: msg });
  }
});

// Start server with Vite middleware in development or static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LexiCore server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
