import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Pharmacist assistant. Ask me anything about your medications, interactions, or health questions.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user" as const, content: input }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content:
            "I'm currently in demo mode. Connect to Med-Minder Cloud to enable AI-powered medication guidance!",
        },
      ]);
    }, 1000);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 z-50 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/90 shadow-2xl backdrop-blur-xl sm:w-96"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] p-4"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Bot className="h-5 w-5 text-primary-foreground" />
              <div>
                <p className="text-sm font-semibold text-primary-foreground">AI Pharmacist</p>
                <p className="text-[11px] text-primary-foreground/70">Powered by MediMinder AI</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="ml-auto text-primary-foreground/70 hover:text-primary-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex h-72 flex-col gap-3 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "assistant"
                      ? "self-start border border-white/[0.06] bg-white/[0.04] text-foreground"
                      : "self-end bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about medications..."
                  className="glass-input flex-1 py-2.5 text-sm"
                />
                <button
                  onClick={handleSend}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg glow-accent"
        style={{ background: "var(--gradient-accent)" }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-accent-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-accent-foreground" />
        )}
      </motion.button>
    </>
  );
};

export default AIChatWidget;
