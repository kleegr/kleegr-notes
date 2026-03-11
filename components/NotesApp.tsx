'use client';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './NotesApp.module.css';

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kleegr_notes');
    if (saved) {
      const parsed = JSON.parse(saved) as Note[];
      setNotes(parsed);
      if (parsed.length) setActiveId(parsed[0].id);
    }
    setMounted(true);
  }, []);

  const save = useCallback((updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('kleegr_notes', JSON.stringify(updated));
  }, []);

  const newNote = () => {
    const note: Note = {
      id: uuidv4(),
      title: '',
      body: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [note, ...notes];
    save(updated);
    setActiveId(note.id);
  };

  const deleteNote = (id: string) => {
    if (!confirm('Delete this note?')) return;
    const updated = notes.filter((n) => n.id !== id);
    save(updated);
    setActiveId(updated.length ? updated[0].id : null);
  };

  const updateNote = (id: string, field: 'title' | 'body', value: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, [field]: value, updatedAt: Date.now() } : n
    );
    save(updated);
  };

  const active = notes.find((n) => n.id === activeId) ?? null;

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase())
  );

  const ago = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

  if (!mounted) return null;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.logo}>Kleegr <span>notes</span></div>
        <div className={styles.count}>{notes.length} note{notes.length !== 1 ? 's' : ''}</div>
      </header>

      <div className={styles.app}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideTop}>
            <button className={styles.newBtn} onClick={newNote}>+ New Note</button>
          </div>
          <div className={styles.searchWrap}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.notesList}>
            {filtered.length === 0 ? (
              <div className={styles.emptyList}>
                {search ? 'No matches found' : 'No notes yet.\nClick + New Note to start.'}
              </div>
            ) : (
              filtered.map((note) => (
                <div
                  key={note.id}
                  className={`${styles.noteItem} ${note.id === activeId ? styles.active : ''}`}
                  onClick={() => setActiveId(note.id)}
                >
                  <div className={styles.noteTitle}>{note.title || 'Untitled'}</div>
                  <div className={styles.notePreview}>{note.body.replace(/\n/g, ' ') || 'No content'}</div>
                  <div className={styles.noteDate}>{ago(note.updatedAt)}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className={styles.editorPane}>
          {active ? (
            <>
              <div className={styles.editorToolbar}>
                <input
                  className={styles.titleInput}
                  type="text"
                  placeholder="Note title..."
                  value={active.title}
                  onChange={(e) => updateNote(active.id, 'title', e.target.value)}
                  autoFocus
                />
                <button className={styles.deleteBtn} onClick={() => deleteNote(active.id)} title="Delete">&#128465;</button>
              </div>
              <div className={styles.editorBody}>
                <textarea
                  className={styles.bodyInput}
                  placeholder="Start writing..."
                  value={active.body}
                  onChange={(e) => updateNote(active.id, 'body', e.target.value)}
                />
              </div>
              <div className={styles.editorFooter}>
                <div className={styles.saveIndicator}>
                  <div className={styles.dot} />
                  Auto-saved
                </div>
                <span>{wordCount(active.body)} words</span>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>&#128221;</div>
              <p>Select or create a note</p>
              <small>Click &ldquo;+ New Note&rdquo; to get started</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
