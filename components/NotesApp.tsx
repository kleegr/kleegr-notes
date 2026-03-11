'use client';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kleegr_notes');
    if (saved) {
      const parsed = JSON.parse(saved) as Note[];
      setNotes(parsed);
      if (parsed.length) setActiveId(parsed[0].id);
    }
    const savedTheme = (localStorage.getItem('kleegr_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    const savedLogo = localStorage.getItem('kleegr_logo');
    if (savedLogo) setLogoUrl(savedLogo);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kleegr_theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      localStorage.setItem('kleegr_logo', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem('kleegr_logo');
  };

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
    save([note, ...notes]);
    setActiveId(note.id);
  };

  const deleteNote = (id: string) => {
    if (!confirm('Delete this note?')) return;
    const updated = notes.filter((n) => n.id !== id);
    save(updated);
    setActiveId(updated.length ? updated[0].id : null);
  };

  const updateNote = (id: string, field: 'title' | 'body', value: string) => {
    save(notes.map((n) => (n.id === id ? { ...n, [field]: value, updatedAt: Date.now() } : n)));
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
    <div className={styles.root} data-theme={theme}>
      <header className={styles.header}>
        {/* Company Logo Area */}
        <div className={styles.logoArea}>
          {logoUrl ? (
            <div className={styles.logoImgWrap}>
              <Image src={logoUrl} alt="Company logo" width={32} height={32} className={styles.logoImg} unoptimized />
              <button className={styles.logoRemove} onClick={removeLogo} title="Remove logo">✕</button>
            </div>
          ) : (
            <label className={styles.logoUpload} title="Upload company logo">
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              <span className={styles.logoPlaceholder}>🏢</span>
              <span className={styles.logoUploadHint}>Add logo</span>
            </label>
          )}
        </div>

        <div className={styles.logoText}>Kleegr <span>notes</span></div>

        <div className={styles.headerRight}>
          <div className={styles.count}>{notes.length} note{notes.length !== 1 ? 's' : ''}</div>
          {/* Dark/Light Mode Toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className={styles.app}>
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
