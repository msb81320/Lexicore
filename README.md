# LexiCore

**Learn words, not flashcards.**

LexiCore is a local-first vocabulary app built on spaced repetition. Type a word and AI builds a full entry for it. Then, instead of showing you the same card over and over, LexiCore quizzes you on that word from different angles, always targeting the part you know least.

## Why LexiCore is different

**One word, one schedule, many ways to be tested.**
Most flashcard tools create separate cards for each question and schedule them independently. LexiCore keeps a single [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) memory schedule per word, and chooses *how* to test it each time:

| Question type | What it trains |
|---|---|
| Word → Meaning | Recalling the definition |
| Meaning → Word | Producing the word yourself |
| Contextual Cloze | Using the word in a real sentence |
| Chunk Completion | Natural collocations ("shun the *limelight*") |
| Nuance Choice | Telling close synonyms apart |

The next question is picked from your weakest of five knowledge dimensions, and from the variant you haven't seen for the longest time. A word you can recognize on one card layout isn't really learned yet; this keeps you from settling for that.

**Words come with the phrases they live in.**
Each entry includes high-frequency collocations, example sentences, register, etymology, a memory hook, and short notes on how it differs from its synonyms, because knowing a word means knowing how it is used.

**AI that does the tedious part.**
Enter up to five words and Gemini generates complete entries, including the question variants. Responses are validated against a strict schema before they reach your library, so malformed output doesn't end up in your cards.

**You can see what you actually know.**
A five-axis radar shows your mastery of meaning, context, collocations, nuance and active production for each word, next to streaks and review statistics.

**Your data stays with you.**
Everything lives in your browser (IndexedDB). Reviews work offline, the app installs as a PWA, and you can export or import your library as JSON at any time. Only AI generation needs a connection, and your API key never leaves the server.

## More features

- FSRS scheduling via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) with a 90% target retention, and the next interval shown on every rating button
- Decks, search, starring and suspending, with starter decks for IELTS Band 8+ and GRE-level vocabulary
- Daily streaks and an optional review reminder (browser notification plus in-app banner)
- Text-to-speech pronunciation (US/UK) and optional AI-generated mnemonic images
- Full backup or vocabulary-only export

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/LexiCore.git
   cd LexiCore
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your [Gemini API key](https://aistudio.google.com/apikey) to a `.env.local` file (only needed for AI features):
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```
4. Start the app and open [http://localhost:3000](http://localhost:3000):
   ```bash
   npm run dev
   ```

For a production build, run `npm run build` followed by `npm start`.

## Your Data & Backups

Cards are stored only in your browser, so clearing site data or uninstalling the app deletes them. Export a backup from **Stats → Export JSON** now and then. You can restore it from the **Decks** screen.

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Dexie (IndexedDB) · ts-fsrs · Express · Google Gemini · Zod · vite-plugin-pwa

## Project Structure

```
├── server.ts                # Express server + Gemini endpoints
├── src/
│   ├── engine/scheduler.ts  # FSRS wrapper, adaptive variant selection, mastery updates
│   ├── db/                  # IndexedDB, streaks, reminders, import/export, starter decks
│   ├── components/          # Dashboard, study session, add words, decks, stats
│   └── hooks/               # PWA install, speech, online status
└── public/                  # PWA icons and assets
```

## Contributing

Issues and pull requests are welcome. Please run `npm run lint` before submitting.
