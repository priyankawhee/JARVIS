import { useState, useRef, useEffect, useMemo } from "react";
import { memo } from "react";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// === STABLE PARTICLE BACKGROUND ===
const ParticleBackground = memo(() => {
  const particles = useMemo(() => {
    return [...Array(25)].map((_, i) => {
      const types = ['triangle', 'hex', 'circle'];
      const type = types[Math.floor(Math.random() * types.length)];
      const size = 18 + Math.random() * 35;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 12;
      return { type, size, left, top, delay, key: i };
    });
  }, []);

  return (
    <div className="particle-bg">
      {particles.map(p => (
        <div
          key={p.key}
          className={`particle ${p.type}`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
});

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [files, setFiles] = useState([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

 const sendMessage = async () => {
  if (!input.trim()) return;

  setMessages(prev => [...prev, { sender: "user", text: input }]);
  setInput("");
  setIsTyping(true);

  const recentMessages = messages
    .slice(-10)
    .map(m => m.sender === "user" ? `User: ${m.text}` : `Jarvis: ${m.text}`)
    .join("\n");

  const payload = {
    message: input,
    chat_history: recentMessages
  };

  try {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setIsTyping(false);
    setMessages(prev => [...prev, { sender: "jarvis", text: data.response }]);
  } catch (err) {
    setIsTyping(false);
    setMessages(prev => [...prev, { sender: "jarvis", text: `Error: ${err.message}` }]);
  }
};

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setMessages(prev => [
      ...prev,
      { sender: "user", text: `Attached: ${selected.map(f => f.name).join(", ")}` }
    ]);
  };

  return (
    <div className="app-container">
      {/* NEBULA BACKGROUND */}
      <div className="gradient-bg"></div>

      {/* STABLE FLOATING PARTICLES */}
      <ParticleBackground />

      {/* CHAT WITH HALO */}
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="chat-wrapper"
      >
        <div className="chat-halo"></div>

        <div className="chat-card">
          <div className="chat-header">
            <motion.h1
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              Jarvis Assistant
            </motion.h1>
            <p>Your AI-powered study companion</p>
          </div>

          <div className="chat-body">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.sender === "user" ? 60 : -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className={`message ${msg.sender}`}
                >
                  <div className="bubble">
                    {msg.sender === "jarvis" ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 style={{fontSize: '1.4em', margin: '16px 0 8px', fontWeight: 'bold', color: '#60a5fa'}} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{fontSize: '1.2em', margin: '12px 0 6px', fontWeight: 'bold', color: '#a78bfa'}} {...props} />,
                          ul: ({node, ...props}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}} {...props} />,
                          ol: ({node, ...props}) => <ol style={{margin: '8px 0', paddingLeft: '20px'}} {...props} />,
                          li: ({node, ...props}) => <li style={{margin: '4px 0'}} {...props} />,
                          strong: ({node, ...props}) => <strong style={{color: '#60a5fa', fontWeight: 'bold'}} {...props} />,
                          em: ({node, ...props}) => <em style={{color: '#c084fc'}} {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="message jarvis"
              >
                <div className="bubble typing">
                  <span></span><span></span><span></span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              placeholder="Ask Jarvis anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <button onClick={() => fileInputRef.current?.click()} className="attach-btn">
              Attach
            </button>
            <button onClick={sendMessage} className="send-btn">
              Send
            </button>
          </div>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept=".pdf,.txt,.docx,.csv,.json"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default App;