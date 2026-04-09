import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, User, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playNotificationSound, showBrowserNotification, requestNotificationPermission } from "@/utils/notifications";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  type: string;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

const Chat = () => {
  const { userId, profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  // Determine if user is a patient or healthcare provider
  const isPatient = profile?.role === "patient" || !profile?.role;
  const isProvider = profile?.role === "pharmacist" || profile?.role === "caregiver";

  useEffect(() => {
    // Check if we're on mobile
    setMobileView(window.innerWidth < 768);
    const handleResize = () => setMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchContacts();
      // Request notification permission on page load
      requestNotificationPermission().catch(() => {
        // Silent fail
      });
    }
  }, [userId, profile?.role, profile?.id]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000); // Poll for new messages
      
      // Set up real-time subscription for incoming messages
      const channel = supabase
        .channel(`chat-messages-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        }, (payload) => {
          const newMsg = payload.new as Message;
          // Only show notification if it's from the selected contact
          if (newMsg.sender_id === selectedContact.id) {
            setMessages((prev) => [...prev, newMsg]);
            
            // Play notification sound
            playNotificationSound();
            
            // Show toast and browser notification
            toast.success(`Message from ${selectedContact.first_name}`);
            showBrowserNotification(`New message from ${selectedContact.first_name}`, {
              body: newMsg.content.substring(0, 100),
              tag: "medication-chat",
            });
          }
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [selectedContact, userId]);

  const fetchContacts = async () => {
    if (!userId || !profile) return;
    setLoading(true);

    try {
      if (profile.role === "pharmacist") {
        // Pharmacist: get assigned patients
        const { data: assignments } = await supabase
          .from("patient_assignments")
          .select("patient_id")
          .eq("assigned_user_id", profile.id)
          .eq("assignment_role", "pharmacist");

        if (assignments && assignments.length > 0) {
          const patientIds = assignments.map((a: any) => a.patient_id);
          
          const { data: patients } = await supabase
            .from("users")
            .select("id, first_name, last_name")
            .in("id", patientIds);

          if (patients) {
            setContacts(patients);
            if (patients.length > 0 && !selectedContact) {
              setSelectedContact(patients[0]);
            }
          }
        }
      } else if (profile.role === "caregiver") {
        // Caregiver: get assigned patients
        const { data: assignments } = await supabase
          .from("patient_assignments")
          .select("patient_id")
          .eq("assigned_user_id", profile.id)
          .eq("assignment_role", "caregiver");

        if (assignments && assignments.length > 0) {
          const patientIds = assignments.map((a: any) => a.patient_id);
          
          const { data: patients } = await supabase
            .from("users")
            .select("id, first_name, last_name")
            .in("id", patientIds);

          if (patients) {
            setContacts(patients);
            if (patients.length > 0 && !selectedContact) {
              setSelectedContact(patients[0]);
            }
          }
        }
      } else {
        // Patient: get assigned caregivers/pharmacists
        const { data: assignments } = await supabase
          .from("patient_assignments")
          .select("assigned_user_id")
          .eq("patient_id", userId);

        if (assignments && assignments.length > 0) {
          const caregiverIds = assignments.map((a: any) => a.assigned_user_id);
          
          const { data: caregivers } = await supabase
            .from("users")
            .select("id, first_name, last_name")
            .in("id", caregiverIds);

          if (caregivers) {
            setContacts(caregivers);
            if (caregivers.length > 0 && !selectedContact) {
              setSelectedContact(caregivers[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!userId || !selectedContact) return;

    setMessagesLoading(true);
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      toast.error("Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !selectedContact) return;

    const tempMessage = newMessage;
    setNewMessage("");

    try {
      // Determine patient_id based on user role
      const patientId = isPatient ? userId : selectedContact.id;

      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          recipient_id: selectedContact.id,
          patient_id: patientId,
          content: tempMessage,
          type: "message",
        });

      if (error) {
        console.error("Send error:", error);
        toast.error("Failed to send message: " + error.message);
        setNewMessage(tempMessage);
      } else {
        await fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
      setNewMessage(tempMessage);
    }
  };



  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc: any, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col md:flex-row gap-4"
    >
      {/* Contacts Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${mobileView && selectedContact ? "hidden" : ""} w-full md:w-80 flex flex-col border border-white/[0.08] rounded-2xl bg-card overflow-hidden`}
      >
        <div className="p-4 border-b border-white/[0.08]">
          <h2 className="font-display text-lg font-bold">Care Team Chat</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {profile?.role === "pharmacist" ? "Patients" : profile?.role === "caregiver" ? "Patients" : "Care Team"}
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <User className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No contacts</p>
            <p className="text-xs text-muted-foreground mt-1">
              {profile?.role === "pharmacist"
                ? "No patients assigned yet"
                : profile?.role === "caregiver"
                ? "No patients assigned yet"
                : "No caregivers assigned yet"}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {contacts.map((contact) => (
              <motion.button
                key={contact.id}
                whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors ${
                  selectedContact?.id === contact.id ? "bg-white/[0.08]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    {contact.first_name[0]}{contact.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs text-muted-foreground">@{contact.first_name.toLowerCase()}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Chat Area */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${mobileView && !selectedContact ? "hidden" : ""} flex-1 flex flex-col border border-white/[0.08] rounded-2xl bg-card overflow-hidden`}
      >
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                {mobileView && (
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="p-2 hover:bg-white/[0.08] rounded-lg"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <p className="font-semibold">{selectedContact.first_name} {selectedContact.last_name}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send a message to {selectedContact.first_name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedMessages).map(([date, msgs]: [string, any]) => (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <p className="text-xs text-muted-foreground px-2">{date}</p>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                      </div>
                      <div className="space-y-2">
                        {msgs.map((msg: Message) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2.5 rounded-2xl ${
                                msg.sender_id === userId
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-secondary text-secondary-foreground rounded-bl-none"
                              }`}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className={`text-[11px] mt-1 ${msg.sender_id === userId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/[0.08] flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-xl bg-background border border-white/[0.08] px-4 py-2.5 text-sm placeholder-muted-foreground focus:outline-none focus:border-white/[0.16]"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold mb-2">No conversation selected</p>
            <p className="text-sm text-muted-foreground">
              {mobileView 
                ? "Select a contact to start chatting" 
                : "Select a contact from the left to start a conversation"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Chat;
