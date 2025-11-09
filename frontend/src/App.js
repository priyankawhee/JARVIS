import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

 const sendMessage = async () => {
  if (!input.trim()) return;

  const userMessage = input;
  setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
  setInput("");
  setIsTyping(true);

  try {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    setIsTyping(false);
    setMessages((prev) => [...prev, { sender: "jarvis", text: data.response }]);

  } catch (err) {
    console.error("Connection failed:", err);
    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      { 
        sender: "jarvis", 
        text: `Cannot reach backend. Is it running on port 8000?\n\nError: ${err.message}` 
      },
    ]);
  }
};
  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <h1>Jarvis Assistant 🤖</h1>
        <p>Your AI-powered study companion</p>
      </div>

      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.sender === "user" ? "user" : "jarvis"}`}
          >
            <div className="message-bubble">{msg.text}</div>
          </div>
        ))}

        {isTyping && (
          <div className="message jarvis typing">
            <div className="typing-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;