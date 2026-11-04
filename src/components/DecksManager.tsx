import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Flame,
  Download,
  Upload,
  BookOpen,
  Check,
  AlertCircle,
  FolderPlus,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Deck, VocabularyLearningUnit } from '../types';
import { db, deleteDeck, exportDatabaseAsJson, importDatabaseFromJson } from '../db';

interface DecksManagerProps {
  decks: Deck[];
  units: VocabularyLearningUnit[];
  onDecksUpdated: () => void;
  onStudyDeck: (deckId: string) => void;
  onBackToDashboard?: () => void;
}

export const DecksManager: React.FC<DecksManagerProps> = ({
  decks,
  units,
  onDecksUpdated,
  onStudyDeck,
  onBackToDashboard,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckColor, setNewDeckColor] = useState('#6366f1');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const colors = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky
    '#10b981', // Emerald
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ec4899', // Pink
  ];

  const handleConfirmDeleteDeck = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteDeck(deckToDelete.id);
      setImportStatus(`Deck "${deckToDelete.name}" and ${res.deletedUnitsCount} items deleted.`);
      onDecksUpdated();
      setDeckToDelete(null);
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      console.error('Delete deck error:', err);
      setImportStatus('Failed to delete deck.');
      setTimeout(() => setImportStatus(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    const newDeck: Deck = {
      id: `deck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newDeckName.trim(),
      description: newDeckDesc.trim() || undefined,
      color: newDeckColor,
      createdAt: Date.now(),
    };

    await db.decks.put(newDeck);
    onDecksUpdated();
    setShowCreateModal(false);
    setNewDeckName('');
    setNewDeckDesc('');
  };

  const handleExportJson = async () => {
    const jsonString = await exportDatabaseAsJson();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexicore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await importDatabaseFromJson(text);
      setImportStatus(`Successfully restored ${res.unitsAdded} units and ${res.decksAdded} decks.`);
      onDecksUpdated();
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus('Failed to import backup file. Ensure it is valid JSON.');
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const nowIso = new Date().toISOString();

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28 text-slate-200">
      {/* Back to Dashboard Navigation */}
      {onBackToDashboard && (
        <div className="mb-4">
          <button
            id="btn-decks-back-dashboard"
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Vocabulary Decks</h2>
          <p className="text-xs text-slate-400 mt-0.5">Organize and target your learning domains</p>
        </div>

        <button
          id="btn-create-deck-modal"
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Deck</span>
        </button>
      </div>

      {/* Import/Export Banner */}
      {importStatus && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Decks List */}
      <div className="space-y-3 mb-8">
        {decks.map((deck) => {
          const deckUnits = units.filter((u) => u.deckId === deck.id);
          const dueCount = deckUnits.filter(
            (u) => !u.isSuspended && u.fsrs.due <= nowIso && u.fsrs.reps > 0
          ).length;
          const newCount = deckUnits.filter((u) => !u.isSuspended && u.fsrs.reps === 0).length;

          return (
            <div
              key={deck.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: deck.color || '#6366f1' }}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white tracking-tight">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {deck.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Deck Action CTAs: Delete & Study */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id={`btn-delete-deck-${deck.id}`}
                    onClick={() => setDeckToDelete(deck)}
                    title={`Delete "${deck.name}" deck`}
                    aria-label={`Delete ${deck.name}`}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id={`btn-study-deck-${deck.id}`}
                    onClick={() => onStudyDeck(deck.id)}
                    disabled={deckUnits.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    <span>Study</span>
                  </button>
                </div>
              </div>

              {/* Counts Breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center text-xs">
                <div className="bg-slate-800/40 py-1.5 rounded-lg">
                  <span className="font-bold text-white block">{deckUnits.length}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Items</span>
                </div>
                <div className="bg-slate-800/40 py-1.5 rounded-lg">
                  <span className="font-bold text-rose-400 block">{dueCount}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Due Now</span>
                </div>
                <div className="bg-slate-800/40 py-1.5 rounded-lg">
                  <span className="font-bold text-sky-400 block">{newCount}</span>
                  <span className="text-[10px] text-slate-400 font-medium">New</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Backup & Portability Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span>Data Portability & Local Backups</span>
        </h4>
        <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
          Export your entire vocabulary library and FSRS review histories as a JSON archive.
        </p>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-backup"
            onClick={handleExportJson}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Backup</span>
          </button>

          <label
            id="label-import-backup"
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CREATE DECK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold mb-1">Create New Deck</h3>
            <p className="text-xs text-slate-400 mb-4">
              Group vocabulary by study theme, exam, or literature.
            </p>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Deck Name *
                </label>
                <input
                  id="input-deck-name"
                  type="text"
                  required
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="e.g. Legal & Policy Lexicon"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  id="input-deck-desc"
                  type="text"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  placeholder="e.g. High-frequency vocabulary for courtroom arguments"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Color Accent
                </label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewDeckColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newDeckColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-deck"
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20"
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Deck Confirmation Modal */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight mb-1">Delete Deck</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">&ldquo;{deckToDelete.name}&rdquo;</strong>?
              {units.filter((u) => u.deckId === deckToDelete.id).length > 0 ? (
                <span className="block mt-2 text-rose-400 font-medium">
                  Warning: All {units.filter((u) => u.deckId === deckToDelete.id).length} vocabulary cards in this deck will also be permanently deleted.
                </span>
              ) : (
                <span className="block mt-2 text-slate-400">
                  This deck has no vocabulary cards.
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeckToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-deck"
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteDeck}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Deck'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
