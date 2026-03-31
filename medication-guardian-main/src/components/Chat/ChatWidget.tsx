import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, User, Pill, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  type: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface Caregiver {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
}

const ChatWidget = () => {
  const { userId, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatTitle, setChatTitle] = useState("Care Team Chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine if user is a patient (regular user) or healthcare provider
  const isPatient = profile?.role === "patient" || !profile?.role;
  const isProvider = profile?.role === "pharmacist" || profile?.role === "caregiver";

  useEffect(() => {
    if (isOpen && userId) {
      fetchContacts();
    }
  }, [isOpen, userId, profile?.role]);

  useEffect(() => {
    if (selectedCaregiver && isOpen) {
      fetchMessages();
      // Set up real-time subscription
      const channel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCaregiver, isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch contacts based on user role
  const fetchContacts = async () => {
    if (!userId || !profile) return;
    
    try {
      if (profile.role === "pharmacist") {
        // Pharmacist: get assigned patients
        const { data: assignments } = await (supabase as any)
          .from("patient_assignments")
          .select("patient_id")
          .eq("assigned_user_id", userId)
          .eq("assignment_role", "pharmacist");

        if (assignments && assignments.length > 0) {
          const patientIds = assignments.map((a: any) => a.patient_id);
          
          const { data: patients } = await (supabase as any)
            .from("users")
            .select("id, first_name, last_name")
            .in("id", patientIds);

          if (patients) {
            setCaregivers(patients);
            setChatTitle("Patient Chat");
            if (patients.length > 0 && !selectedCaregiver) {
              setSelectedCaregiver(patients[0]);
            }
          }
        }
      } else {
        // Patient or caregiver: get assigned caregivers
        const { data: assignments } = await (supabase as any)
          .from("patient_assignments")
          .select("assigned_user_id")
          .eq("patient_id", userId);

        if (assignments && assignments.length > 0) {
          const caregiverIds = assignments.map((a: any) => a.assigned_user_id);
          
          const { data: users } = await (supabase as any)
            .from("users")
            .select("id, first_name, last_name")
            .in("id", caregiverIds);

          if (users) {
            setCaregivers(users);
            setChatTitle("Care Team Chat");
            if (users.length > 0 && !selectedCaregiver) {
              setSelectedCaregiver(users[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const fetchMessages = async () => {
    if (!userId || !selectedCaregiver) return;

    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${selectedCaregiver.id}),and(sender_id.eq.${selectedCaregiver.id},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !selectedCaregiver) return;

    try {
      const { error } = await (supabase as any)
        .from("messages")
        .insert({
          sender_id: userId,
          recipient_id: selectedCaregiver.id,
          patient_id: userId,
          content: newMessage,
          type: "message",
        });

      if (!error) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendRefillRequest = async (medicationName: string) => {
    if (!userId || !selectedCaregiver) return;

    try {
      const { error } = await (supabase as any)
        .from("messages")
        .insert({
          sender_id: userId,
          recipient_id: selectedCaregiver.id,
          patient_id: userId,
          content: `Requesting refill for ${medicationName}`,
          type: "refill_request",
        });

      if (!error) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending refill request:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ background: "var(--gradient-accent)" }}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-card p-4">
              <div>
                <p className="font-semibold text-foreground">{chatTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCaregiver 
                    ? `Chatting with ${selectedCaregiver.first_name} ${selectedCaregiver.last_name}`
                    : "Select a contact to chat"}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Caregiver Selector */}
            {caregivers.length > 1 && (
              <div className="border-b border-white/10 bg-card/50 p-2">
                <select
                  value={selectedCaregiver?.id || ""}
                  onChange={(e) => {
                    const caregiver = caregivers.find((c) => c.id === e.target.value);
                    setSelectedCaregiver(caregiver || null);
                  }}
                  className="w-full rounded-lg bg-background px-3 py-2 text-sm border border-white/10"
                >
                  {caregivers.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.first_name} {cg.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Messages */}
            <div className="h-64 overflow-y-auto bg-background/50 p-4">
              {!selectedCaregiver ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <User className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {profile?.role === "pharmacist" 
                      ? "No patients assigned yet" 
                      : "No caregivers assigned yet"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {profile?.role === "pharmacist"
                      ? "Add patients from the Pharmacy page"
                      : "Ask your healthcare provider to assign a caregiver"}
                  </p>
                </div>
              ) : loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with {selectedCaregiver.first_name}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] ${msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {selectedCaregiver && (
              <div className="flex gap-2 border-t border-white/10 bg-card/50 px-3 py-2">
                <button
                  onClick={() => sendRefillRequest("medication")}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  <RefreshCw className="h-3 w-3" /> Request Refill
                </button>
              </div>
            )}

            {/* Input */}
            {selectedCaregiver && (
              <div className="flex gap-2 border-t border-white/10 bg-card p-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg bg-background border border-white/10 px-3 py-2 text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
