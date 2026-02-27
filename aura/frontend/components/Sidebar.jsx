import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

const NAV_ITEMS = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'memories', icon: '🧠', label: 'Memories' },
  { id: 'persona', icon: '✨', label: 'Persona' },
  { id: 'schedule', icon: '📅', label: 'Schedule' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

function MemoriesPanel() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/memory`);
      if (!res.ok) throw new Error(`Failed to fetch memories`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const dt = new Date(ts);
      const now = new Date();
      const diffMs = now - dt;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return ts.slice(0, 10);
    }
  };

  if (loading) {
    return (
      <div className="memories-panel">
        <div className="memories-loading">
          <span className="memories-loading__dot" />
          <span className="memories-loading__dot" />
          <span className="memories-loading__dot" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memories-panel">
        <div className="memories-empty">
          <span className="memories-empty__icon">⚠️</span>
          <span>Couldn't load memories</span>
          <button className="memories-retry" onClick={fetchMemories}>Retry</button>
        </div>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div className="memories-panel">
        <div className="memories-empty">
          <span className="memories-empty__icon">🧠</span>
          <span>No memories yet</span>
          <span className="memories-empty__hint">Start chatting and I'll remember!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="memories-panel">
      <div className="memories-header">
        <span className="memories-header__title">Memories</span>
        <span className="memories-header__count">{memories.length}</span>
      </div>
      <div className="memories-list">
        {memories.map((mem) => (
          <div key={mem.id} className="memory-card">
            <div className="memory-card__text">{mem.text}</div>
            <div className="memory-card__meta">
              <span className="memory-card__time">{formatTimestamp(mem.timestamp)}</span>
              {mem.emotion && (
                <span className="memory-card__tag memory-card__tag--emotion">{mem.emotion}</span>
              )}
              {mem.topic && (
                <span className="memory-card__tag memory-card__tag--topic">{mem.topic}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <div className="sidebar">
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar__item${activeTab === item.id ? ' sidebar__item--active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'memories' && <MemoriesPanel />}

      <div className="sidebar__badge">
        <span className="sidebar__badge-dot" />
        <span>Gemma 3 4B · Local</span>
      </div>
    </div>
  );
}
