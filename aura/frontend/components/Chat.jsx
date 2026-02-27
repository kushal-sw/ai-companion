// Chat interface
// → Message bubbles (user + Aura)
// → Typing indicator animation
// → Text input + send button
// → Mic button → triggers voice pipeline (Phase 3)

import React, { useState, useRef, useEffect } from 'react';

export default function Chat({ messages, onSend, isTyping }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
            <div className="chat-bubble">{msg.text}</div>
            <span className="chat-time">{msg.time}</span>
          </div>
        ))}
        {isTyping && (
          <div className="chat-typing">
            <span className="chat-typing__dot" />
            <span className="chat-typing__dot" />
            <span className="chat-typing__dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-bar">
        <button className="chat-btn chat-btn--mic" title="Voice input (Phase 3)">
          🎤
        </button>
        <input
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="chat-btn chat-btn--send"
          onClick={handleSend}
          disabled={!input.trim()}
          title="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
