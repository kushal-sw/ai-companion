import React, { useState, useCallback, useRef } from "react";
import TitleBar from "./components/TitleBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Avatar from "./components/Avatar.jsx";
import Chat from "./components/Chat.jsx";

const API_BASE = "/api";

function getTimeString() {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function App() {
  const [messages, setMessages] = useState([]);
  const [expression, setExpression] = useState("neutral");
  const [isTyping, setIsTyping] = useState(false);
  const [speakingText, setSpeakingText] = useState(null);
  const [gesture, setGesture] = useState("idle");
  const [activeTab, setActiveTab] = useState("chat");
  const abortRef = useRef(null);
  const gestureTimerRef = useRef(null);
  const expressionDecayRef = useRef(null);
  const midStreamCharCount = useRef(0);

  // Characters accumulated before triggering a mid-stream emotion check
  const MID_STREAM_INTERVAL = 50;

  const sendMessage = useCallback(
    async (text) => {
      const userMsg = {
        id: `msg-${Date.now()}`,
        role: "user",
        text,
        time: getTimeString(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setExpression("listening");
      midStreamCharCount.current = 0;

      // Cancel any pending expression decay
      if (expressionDecayRef.current) {
        clearTimeout(expressionDecayRef.current);
        expressionDecayRef.current = null;
      }

      const auraId = `msg-${Date.now() + 1}`;

      const history = [...messages, userMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Backend returned ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";
        let buffer = "";

        const auraMsg = {
          id: auraId,
          role: "aura",
          text: "",
          emotion: "neutral",
          time: getTimeString(),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, auraMsg]);
        setIsTyping(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.error) {
                fullReply = `Sorry, I couldn't respond right now. (${data.error})`;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === auraId ? { ...m, text: fullReply } : m,
                  ),
                );
                break;
              }

              fullReply += data.token || "";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === auraId ? { ...m, text: fullReply } : m,
                ),
              );

              // ── Mid-stream emotion detection ──
              // Every ~50 chars, classify partial text for live expression
              midStreamCharCount.current += (data.token || "").length;
              if (midStreamCharCount.current >= MID_STREAM_INTERVAL) {
                midStreamCharCount.current = 0;
                // Fire-and-forget: update expression from partial reply
                fetch(`${API_BASE}/emotion`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: fullReply }),
                })
                  .then((r) => r.ok ? r.json() : null)
                  .then((emo) => {
                    if (emo && emo.emotion && emo.emotion !== "neutral") {
                      setExpression(emo.emotion);
                    }
                  })
                  .catch(() => {});
              }

              if (data.done) {
                const emotion = data.emotion || "happy";
                const gestureCmd = data.gesture || "idle";
                setExpression(emotion);
                setGesture(gestureCmd);

                // Reset gesture to idle after 4s (longer hold)
                if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
                gestureTimerRef.current = setTimeout(() => setGesture("idle"), 4000);

                // Expression decay: hold emotion 6s, then fade to "relaxed"
                if (expressionDecayRef.current) clearTimeout(expressionDecayRef.current);
                expressionDecayRef.current = setTimeout(() => {
                  setExpression("relaxed");
                }, 6000);

                setSpeakingText(fullReply);
                const speechDuration = Math.max(
                  (fullReply.length / 14) * 1000,
                  800,
                );
                setTimeout(() => setSpeakingText(null), speechDuration);

                // Update message with emotion
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === auraId ? { ...m, emotion } : m,
                  ),
                );
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }

        if (!fullReply) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === auraId
                ? { ...m, text: "Hmm, I couldn't think of what to say..." }
                : m,
            ),
          );
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setIsTyping(false);
        const errorMsg = {
          id: auraId,
          role: "aura",
          text: "I can't reach my brain right now 💜 Make sure the backend server is running!",
          emotion: "sad",
          time: getTimeString(),
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const hasAura = prev.some((m) => m.id === auraId);
          if (hasAura) {
            return prev.map((m) => (m.id === auraId ? errorMsg : m));
          }
          return [...prev, errorMsg];
        });
        setExpression("sad");
      }
    },
    [messages],
  );

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-body">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="main-content">
          <Avatar expression={expression} gesture={gesture} speakingText={speakingText} />
          <Chat messages={messages} onSend={sendMessage} isTyping={isTyping} />
        </div>
      </div>
    </div>
  );
}

export default App;
