import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
  Pause,
  Bell,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  History,
  Volume2,
  VolumeX,
  AlertOctagon,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays, isSameDay, parseISO, startOfDay } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

interface Reminder {
  id: string;
  medicationId: string;
  medication: string;
  dosage: string;
  time: string;
  scheduledTime: Date;
  status: "pending" | "taken" | "missed" | "snoozed" | "late" | "early";
  quantityRemaining?: number;
  totalQuantity?: number;
  takenAt?: Date;
}

interface ReminderLog {
  id: string;
  medication_id: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  medication_name?: string;
  dosage?: string;
}

interface UserPreferences {
  snooze_duration: number;
  notifications_enabled: boolean;
  sound_enabled: boolean;
  theme: string;
}

interface Medication {
  id: string;
  dosage: string;
  frequency: string;
  times: string[];
  status: string;
  medication_id: string;
  quantity_remaining: number | null;
  total_quantity: number | null;
  medications?: { name: string };
}

const statusMap = {
  taken: { icon: CheckCircle2, label: "Taken", badge: "bg-success/10 text-success" },
  missed: { icon: XCircle, label: "Missed", badge: "bg-destructive/10 text-destructive" },
  pending: { icon: Timer, label: "Pending", badge: "bg-warning/10 text-warning" },
  snoozed: { icon: Pause, label: "Snoozed", badge: "bg-accent/10 text-accent" },
  late: { icon: Clock, label: "Late", badge: "bg-orange-500/10 text-orange-500" },
  early: { icon: Clock, label: "Early", badge: "bg-blue-500/10 text-blue-500" },
};

// Drug interaction database (simplified)
const drugInteractions: Record<string, string[]> = {
  "warfarin": ["aspirin", "ibuprofen", "naproxen", "vitamin e"],
  "metformin": ["alcohol", "contrast dye"],
  "lisinopril": ["potassium", "spironolactone"],
  "simvastatin": ["grapefruit", "erythromycin", "clarithromycin"],
  "amiodarone": ["warfarin", "simvastatin", "digoxin"],
  "fluoxetine": ["maois", "tramadol", "triptans"],
};

// Check for drug interactions
const checkInteractions = (medications: string[]): string[] => {
  const warnings: string[] = [];
  const lowerMedNames = medications.map(m => m.toLowerCase());
  
  for (const [drug, interactants] of Object.entries(drugInteractions)) {
    const hasDrug = lowerMedNames.some(m => m.includes(drug));
    if (hasDrug) {
      for (const interactant of interactants) {
        if (lowerMedNames.some(m => m.includes(interactant))) {
          warnings.push(`${drug} + ${interactant}: May cause adverse effects`);
        }
      }
    }
  }
  
  return warnings;
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Reminders = () => {
  const { userId, profile } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "taken" | "missed">("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [preferences, setPreferences] = useState<UserPreferences>({
    snooze_duration: 15,
    notifications_enabled: true,
    sound_enabled: true,
    theme: "dark",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<ReminderLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showQuickSnooze, setShowQuickSnooze] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "table">("list");
  const [showNextDosePopup, setShowNextDosePopup] = useState(false);
  const [tableViewData, setTableViewData] = useState<ReminderLog[]>([]);
  const [showReport, setShowReport] = useState(false);
  
  // Caregiver-specific state
  const [caregiverPatientLogs, setCaregiverPatientLogs] = useState<any[]>([]);
  const [caregiverLoading, setCaregiverLoading] = useState(true);
  const [caregiverFilter, setCaregiverFilter] = useState<"all" | "taken" | "missed">("all");

  // Calculate next pending reminder for popup (only consider next 3 hours)
  const nextReminder = useMemo(() => {
    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    return reminders
      .filter(r => 
        r.status === "pending" && 
        r.scheduledTime > now && 
        r.scheduledTime <= threeHoursLater
      )
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())[0] || null;
  }, [reminders]);

  // Show popup on page load if there's a next reminder due soon
  useEffect(() => {
    if (nextReminder && !showNextDosePopup) {
      const timer = setTimeout(() => setShowNextDosePopup(true), 500);
      return () => clearTimeout(timer);
    }
  }, [nextReminder]);

  // Calculate weekly adherence stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekLogs = historyLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= weekAgo;
    });

    const taken = weekLogs.filter(l => l.status === "taken" || l.status === "late" || l.status === "early").length;
    const missed = weekLogs.filter(l => l.status === "missed").length;
    const total = weekLogs.length;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : -1; // -1 indicates no data

    return { taken, missed, total, adherence };
  }, [historyLogs]);

  // Calculate drug interaction warnings
  const interactionWarnings = useMemo(() => {
    const medNames = reminders.map(r => r.medication);
    return checkInteractions(medNames);
  }, [reminders]);

  // Real-time subscription for reminder changes - placed after functions are defined
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('reminder-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_logs',
          filter: `patient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Reminder change received:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  const [refillAlerts, setRefillAlerts] = useState<Medication[]>([]);
  const [outOfStockMedications, setOutOfStockMedications] = useState<Medication[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("12:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  // Clear shown notifications at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      shownNotificationsRef.current.clear();
    }, msUntilMidnight);
    
    return () => clearTimeout(timeout);
  }, []);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await (supabase as any)
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        setPreferences({
          snooze_duration: data.snooze_duration || 15,
          notifications_enabled: data.notifications_enabled ?? true,
          sound_enabled: data.sound_enabled ?? true,
          theme: data.theme || "dark",
        });
      } else if (error && error.code === "PGRST116") {
        // No preferences found, try to create default (may fail if table doesn't exist)
        try {
          await (supabase as any).from("user_preferences").insert({
            user_id: userId,
            snooze_duration: 15,
            notifications_enabled: true,
            sound_enabled: true,
            theme: "dark",
          });
        } catch (insertErr) {
          // Table doesn't exist yet, use defaults
          console.log("Using default preferences - table may not exist yet");
        }
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
      // Use default preferences
    }
  }, [userId]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    
    const permission = await Notification.requestPermission();
    notificationPermissionRef.current = permission;
    
    if (permission === "denied") {
      toast.error("Notifications blocked. Please enable in browser settings.");
    }
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback(
    (reminder: Reminder) => {
      if (!preferences.notifications_enabled) return;
      if (notificationPermissionRef.current !== "granted") return;

      new Notification(`Time to take ${reminder.medication}!`, {
        body: `${reminder.dosage} at ${reminder.time}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: reminder.id,
        requireInteraction: true,
      });
    },
    [preferences.notifications_enabled]
  );

  // Play notification sound
  const playSound = useCallback(() => {
    if (!preferences.sound_enabled || !audioRef.current) return;
    audioRef.current.play().catch(() => {
      // User hasn't interacted with page yet
    });
  }, [preferences.sound_enabled]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Generate audio element for notifications
  useEffect(() => {
    audioRef.current = new Audio("/notification-sound.mp3");
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check for pending reminders that match current time
  useEffect(() => {
    if (!reminders.length) return;

    const today = new Date();
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Only check today's pending reminders
    const todayPendingReminders = reminders.filter((r) => 
      r.status === "pending" && 
      isSameDay(r.scheduledTime, today)
    );

    todayPendingReminders.forEach((reminder) => {
      const [hours, minutes] = reminder.time.split(":").map(Number);
      const reminderMinutes = hours * 60 + minutes;

      // Check if current time is within 2 minutes of reminder time
      if (Math.abs(currentMinutes - reminderMinutes) <= 2) {
        // Only show notification if not already shown today
        const notificationKey = `${reminder.id}-${today.toDateString()}`;
        if (!shownNotificationsRef.current.has(notificationKey)) {
          shownNotificationsRef.current.add(notificationKey);
          playSound();
          sendBrowserNotification(reminder);
          toast.message(`Time to take ${reminder.medication}!`, {
            description: `${reminder.dosage} at ${reminder.time}`,
            duration: 10000,
          });
        }
      }
    });
  }, [reminders, currentTime, playSound, sendBrowserNotification]);

  // Fetch history logs
  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      console.log("Fetching history for user:", userId);
      
      // Fetch history without nested joins to avoid PostgREST 400 error
      const { data, error } = await (supabase as any)
        .from("reminder_logs")
        .select(
          `id, medication_id, scheduled_time, actual_time, status, notes, created_at`
        )
        .eq("patient_id", userId)
        .gte("scheduled_time", thirtyDaysAgo.toISOString())
        .order("scheduled_time", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
        setHistoryLogs([]);
        return;
      }

      console.log("History fetched successfully:", data?.length, "records");

      // Get medication details separately if we have logs
      if (data && data.length > 0) {
        const medicationIds = [...new Set(data.map((log) => log.medication_id))];
        
        // Fetch medication details in a separate query (not nested to avoid 400 error)
        const { data: medsData } = await (supabase as any)
          .from("patient_medications")
          .select("id, medications(name, dosage)")
          .in("id", medicationIds);

        // Create a map for quick lookup
        const medsMap = new Map();
        (medsData || []).forEach((med: any) => {
          medsMap.set(med.id, med.medications);
        });

        const formattedLogs = (data || []).map((log: any) => ({
          ...log,
          medication_name: medsMap.get(log.medication_id)?.name || "Unknown",
          dosage: medsMap.get(log.medication_id)?.dosage || "",
        }));
        setHistoryLogs(formattedLogs);
      } else {
        setHistoryLogs([]);
      }
    } catch (err) {
      console.error("Error in fetchHistory:", err);
      setHistoryLogs([]);
    }
  }, [userId]);

  // Check and update missed reminders (standalone function to avoid infinite loop)
  const checkAndUpdateMissedReminders = async (remindersList: Reminder[], uid: string) => {
    if (!remindersList.length || !uid) return;

    const now = new Date();
    const updatedReminders = [...remindersList];
    let hasChanges = false;

    for (let i = 0; i < updatedReminders.length; i++) {
      const reminder = updatedReminders[i];
      if (reminder.status === "pending" && reminder.scheduledTime < now) {
        // Mark as missed
        const timeDiff = now.getTime() - reminder.scheduledTime.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff > 1) {
          // Log missed reminder
          try {
            await (supabase as any).from("reminder_logs").insert({
              patient_id: uid,
              medication_id: reminder.medicationId,
              scheduled_time: reminder.scheduledTime.toISOString(),
              status: "missed",
            });
          } catch (e) {
            // Table might not exist, ignore
          }

          updatedReminders[i] = { ...reminder, status: "missed" };
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setReminders(updatedReminders);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    // Fetch all reminder logs for export
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await (supabase as any)
        .from("reminder_logs")
        .select(
          `id, medication_id, scheduled_time, actual_time, status, notes, created_at`
        )
        .eq("patient_id", userId)
        .gte("scheduled_time", thirtyDaysAgo.toISOString())
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      // Get medication details separately
      const medicationIds = [...new Set((data || []).map((log: any) => log.medication_id))];
      const { data: medsData } = await (supabase as any)
        .from("patient_medications")
        .select("id, medications(name, dosage)")
        .in("id", medicationIds);

      const medsMap = new Map();
      (medsData || []).forEach((med: any) => {
        medsMap.set(med.id, med.medications);
      });

      const exportData = (data || []).map((log: any) => ({
        "Medication": medsMap.get(log.medication_id)?.name || "Unknown",
        "Dosage": medsMap.get(log.medication_id)?.dosage || "",
        "Scheduled Time": format(parseISO(log.scheduled_time), "yyyy-MM-dd HH:mm"),
        "Actual Time": log.actual_time ? format(parseISO(log.actual_time), "yyyy-MM-dd HH:mm") : "",
        "Status": log.status?.toUpperCase() || "",
        "Notes": log.notes || "",
        "Created At": format(parseISO(log.created_at), "yyyy-MM-dd HH:mm"),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reminder Logs");
      XLSX.writeFile(workbook, `medication-reminders-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success("Exported to Excel successfully!");
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      toast.error("Failed to export to Excel");
    }
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await (supabase as any)
        .from("reminder_logs")
        .select(
          `id, medication_id, scheduled_time, actual_time, status, notes, created_at`
        )
        .eq("patient_id", userId)
        .gte("scheduled_time", thirtyDaysAgo.toISOString())
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      // Get medication details separately
      const medicationIds = [...new Set((data || []).map((log: any) => log.medication_id))];
      const { data: medsData } = await (supabase as any)
        .from("patient_medications")
        .select("id, medications(name, dosage)")
        .in("id", medicationIds);

      const medsMap = new Map();
      (medsData || []).forEach((med: any) => {
        medsMap.set(med.id, med.medications);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Medication Reminder Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 30);
      doc.text(`User: ${profile?.first_name || ""} ${profile?.last_name || ""}`, 14, 36);

      let yPos = 50;
      const pageHeight = doc.internal.pageSize.height;

      // Table header
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Medication", 14, yPos);
      doc.text("Scheduled", 70, yPos);
      doc.text("Actual", 110, yPos);
      doc.text("Status", 145, yPos);
      yPos += 8;

      // Table content
      doc.setFont("helvetica", "normal");
      (data || []).forEach((log: any, index: number) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        const medName = medsMap.get(log.medication_id)?.name || "Unknown";
        doc.text(medName.substring(0, 25), 14, yPos);
        doc.text(format(parseISO(log.scheduled_time), "MM/dd HH:mm"), 70, yPos);
        doc.text(log.actual_time ? format(parseISO(log.actual_time), "MM/dd HH:mm") : "-", 110, yPos);
        doc.text((log.status || "").toUpperCase(), 145, yPos);
        yPos += 7;
      });

      doc.save(`medication-reminders-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Exported to PDF successfully!");
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      toast.error("Failed to export to PDF");
    }
  };

  // Fetch reminders from database
  const fetchReminders = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Get patient's active medications
      const { data: medications, error } = await supabase
        .from("patient_medications")
        .select(
          `id, dosage, frequency, times, status, medication_id, quantity_remaining, total_quantity`
        )
        .eq("patient_id", userId)
        .eq("status", "active");

      if (error) throw error;

      if (!medications || medications.length === 0) {
        setReminders([]);
        setLoading(false);
        return;
      }

      // Get medication details separately
      const medicationIds = [...new Set(medications.map((m) => m.medication_id))];
      const { data: medsData } = await supabase
        .from("medications")
        .select("id, name")
        .in("id", medicationIds);

      const medsMap = new Map();
      (medsData || []).forEach((med: any) => {
        medsMap.set(med.id, med.name);
      });

      // Add medication names to the medications array
      const medsWithNames = medications.map((med: any) => ({
        ...med,
        medicationName: medsMap.get(med.medication_id) || "Unknown",
      }));

      // Fetch existing reminder logs to check what's already been taken
      const { data: existingLogs } = await (supabase as any)
        .from("reminder_logs")
        .select("medication_id, scheduled_time, status")
        .eq("patient_id", userId);

      // Create a map of logged statuses
      const logMap = new Map();
      (existingLogs || []).forEach((log: any) => {
        const key = `${log.medication_id}-${new Date(log.scheduled_time).toISOString().split("T")[0]}`;
        logMap.set(key, log.status);
      });

      // Check for refill alerts (low stock but not empty) using medsWithNames
      const alerts = medsWithNames.filter(
        (med) =>
          med.total_quantity &&
          med.quantity_remaining !== null &&
          med.quantity_remaining > 0 &&
          med.quantity_remaining / med.total_quantity < 0.2
      );
      setRefillAlerts(alerts);

      // Check for out of stock medications (0 quantity)
      const outOfStock = medsWithNames.filter(
        (med) => med.quantity_remaining === null || med.quantity_remaining <= 0
      );
      setOutOfStockMedications(outOfStock);

      // Filter out medications with no stock (0 quantity)
      const inStockMedications = medsWithNames.filter(
        (med) => med.quantity_remaining !== null && med.quantity_remaining > 0
      );

      // Generate reminders for next 7 days based on frequency
      const generatedReminders: Reminder[] = [];
      const today = new Date();
      const dayOfWeek = today.getDay();

      for (const med of inStockMedications) {
        const medTimes = med.times || [];
        const frequency = med.frequency || "daily";

        // Parse frequency and determine which days to generate reminders
        const daysToGenerate = getDaysToGenerate(frequency, dayOfWeek);

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDate = addDays(today, dayOffset);
          const currentDayOfWeek = currentDate.getDay();

          // Check if we should generate reminder for this day
          if (!daysToGenerate.includes(currentDayOfWeek)) continue;

          for (const timeStr of medTimes) {
            // Parse time string
            let hours: number, minutes: number;

            if (timeStr.includes("AM") || timeStr.includes("PM")) {
              const isPM = timeStr.includes("PM");
              const timeParts = timeStr.replace(/(AM|PM)/i, "").trim().split(":");
              hours = parseInt(timeParts[0]);
              minutes = parseInt(timeParts[1] || "0");
              if (isPM && hours !== 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;
            } else {
              const timeParts = timeStr.split(":");
              hours = parseInt(timeParts[0]);
              minutes = parseInt(timeParts[1] || "0");
            }

            // Create scheduled time for this day
            const scheduledTime = new Date(currentDate);
            scheduledTime.setHours(hours, minutes, 0, 0);

            // Check if already passed
            const isPast = scheduledTime < currentTime;
            
            // Calculate hours since scheduled time for grace period
            const hoursSinceScheduled = isPast 
              ? (currentTime.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60) 
              : 0;
            const isDefinitelyMissed = isPast && hoursSinceScheduled > 3;

            // Format time for display
            const displayTime = `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}`;

            // Check if this reminder was already logged
            const logKey = `${med.id}-${currentDate.toISOString().split("T")[0]}`;
            const loggedStatus = logMap.get(logKey);

            // Determine status: use logged status if exists, otherwise calculate
            let status: Reminder["status"] = "pending";
            if (loggedStatus) {
              status = loggedStatus as Reminder["status"];
            } else if (isDefinitelyMissed) {
              status = "missed";
            }

            generatedReminders.push({
              id: `${med.id}-${currentDate.toISOString().split("T")[0]}-${timeStr}`,
              medicationId: med.id,
              medication: (med as any).medicationName || "Unknown",
              dosage: med.dosage,
              time: displayTime,
              scheduledTime,
              status,
              quantityRemaining: med.quantity_remaining,
              totalQuantity: med.total_quantity,
            });
          }
        }
      }

      // Sort by time
      generatedReminders.sort((a, b) => {
        return a.scheduledTime.getTime() - b.scheduledTime.getTime();
      });

      setReminders(generatedReminders);

      // Check for missed reminders (call directly, not via callback to avoid infinite loop)
      await checkAndUpdateMissedReminders(generatedReminders, userId);
    } catch (err) {
      console.error("Error fetching reminders:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentTime]);

  // Helper function to get days to generate based on frequency
  const getDaysToGenerate = (frequency: string, dayOfWeek: number): number[] => {
    const frequencyLower = frequency.toLowerCase();

    if (frequencyLower === "daily") {
      return [0, 1, 2, 3, 4, 5, 6];
    }

    if (frequencyLower === "weekdays") {
      return [1, 2, 3, 4, 5];
    }

    if (frequencyLower === "weekends") {
      return [0, 6];
    }

    // Parse "every X days" format
    const everyMatch = frequencyLower.match(/every (\d+) days?/);
    if (everyMatch) {
      const interval = parseInt(everyMatch[1]);
      const days: number[] = [];
      for (let i = 0; i < 7; i++) {
        if ((dayOfWeek + i) % interval === 0) {
          days.push((dayOfWeek + i) % 7);
        }
      }
      return days;
    }

    // Default to daily
    return [0, 1, 2, 3, 4, 5, 6];
  };

  useEffect(() => {
    fetchPreferences();
    fetchReminders();
    fetchHistory();
    requestNotificationPermission();
  }, [fetchPreferences, fetchReminders, fetchHistory, requestNotificationPermission]);

  // Fetch caregiver's patient medication logs
  useEffect(() => {
    const fetchCaregiverPatientLogs = async () => {
      if (!profile || profile.role !== "caregiver" || !profile.id) return;
      
      setCaregiverLoading(true);
      try {
        // Get assigned patients
        const { data: assignments } = await supabase
          .from("patient_assignments")
          .select("patient_id, users!patient_assignments_patient_id_fkey(first_name, last_name)")
          .eq("assigned_user_id", profile.id)
          .eq("assignment_role", "caregiver");

        if (!assignments || assignments.length === 0) {
          setCaregiverPatientLogs([]);
          setCaregiverLoading(false);
          return;
        }

        const patientIds = assignments.map((a) => a.patient_id);
        
        // Get reminder logs for all assigned patients
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: logs } = await (supabase as any)
          .from("reminder_logs")
          .select(
            `id, patient_id, medication_id, scheduled_time, actual_time, status, created_at`
          )
          .in("patient_id", patientIds)
          .gte("scheduled_time", thirtyDaysAgo.toISOString())
          .order("scheduled_time", { ascending: false });

        // Get medication details separately
        const medicationIds = [...new Set((logs || []).map((log: any) => log.medication_id))];
        const { data: medsData } = await (supabase as any)
          .from("patient_medications")
          .select("id, medications(name, dosage), quantity_remaining, total_quantity")
          .in("id", medicationIds);

        const medsMap = new Map();
        (medsData || []).forEach((med: any) => {
          medsMap.set(med.id, med);
        });

        // Map patient names to logs
        const patientMap = new Map(assignments.map((a: any) => [a.patient_id, a.users?.first_name + " " + a.users?.last_name]));
        
        const formattedLogs = (logs || []).map((log: any) => {
          const medData = medsMap.get(log.medication_id);
          return {
            ...log,
            patient_name: patientMap.get(log.patient_id) || "Unknown",
            medication_name: medData?.medications?.name || "Unknown",
            dosage: medData?.medications?.dosage || "",
            quantity_remaining: medData?.quantity_remaining || 0,
            total_quantity: medData?.total_quantity || 0,
          };
        });

        setCaregiverPatientLogs(formattedLogs);
      } catch (err) {
        console.error("Error fetching caregiver patient logs:", err);
      } finally {
        setCaregiverLoading(false);
      }
    };

    fetchCaregiverPatientLogs();
  }, [profile]);

  // Filter reminders by selected date (default to today)
  const filteredByDate = useMemo(() => {
    const today = new Date();
    return reminders.filter((r) => isSameDay(r.scheduledTime, today));
  }, [reminders]);

  const filtered = filteredByDate.filter(
    (r) => filter === "all" || r.status === filter
  );

  const markTaken = async (reminder: Reminder, actualTime?: Date) => {
    // Prevent taking future day's medication
    if (reminder.scheduledTime > new Date()) {
      toast.error("Cannot take medication for a future date");
      return;
    }
    
    // Check if trying to take missed medication from a different day than selected
    const isMissedFromOtherDay = reminder.status === "missed" && !isSameDay(reminder.scheduledTime, selectedDate);
    if (isMissedFromOtherDay) {
      toast.error("Cannot take medication from a different day");
      return;
    }

    try {
      // Use current time as actual time
      const takenTime = new Date();
      
      // Check if taking early - within 1 hour before scheduled time is considered early
      const timeDiff = takenTime.getTime() - reminder.scheduledTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Prevent early taking - show message if trying to take more than 1 hour before scheduled time
      if (hoursDiff < -1) {
        toast.error("Cannot take medication early. Please wait until closer to the scheduled time.");
        return;
      }

      // Update the medication's quantity remaining
      const { data: med, error: medError } = await supabase
        .from("patient_medications")
        .select("quantity_remaining")
        .eq("id", reminder.medicationId)
        .single();

      if (medError) {
        console.error("Error fetching medication:", medError);
      } else if (med) {
        const newQty = Math.max(0, (med.quantity_remaining || 1) - 1);
        await supabase
          .from("patient_medications")
          .update({ quantity_remaining: newQty })
          .eq("id", reminder.medicationId);
      }

      // Determine if late or early (within 1 hour window)
      // hoursDiff is already calculated above - if we get here, it's not early (>= -1 hour)
      let status: "taken" | "late" | "early" = "taken";
      if (hoursDiff > 1) status = "late";
      // If hoursDiff is between -1 and 1, it's "taken"

      // Log the reminder to database
      console.log("Saving reminder log to database:", {
        patient_id: userId,
        medication_id: reminder.medicationId,
        scheduled_time: reminder.scheduledTime.toISOString(),
        actual_time: takenTime.toISOString(),
        status,
      });
      
      const { data: insertData, error: insertError } = await (supabase as any)
        .from("reminder_logs")
        .insert({
          patient_id: userId,
          medication_id: reminder.medicationId,
          scheduled_time: reminder.scheduledTime.toISOString(),
          actual_time: takenTime.toISOString(),
          status,
        });

      if (insertError) {
        console.error("Error saving reminder log:", insertError);
        toast.error("Failed to save to database: " + insertError.message);
      } else {
        console.log("Reminder log saved successfully:", insertData);
      }

      // Update local state
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id ? { ...r, status: status as any, takenAt: takenTime } : r
        )
      );

      // Refresh history
      fetchHistory();

      toast.success(`${reminder.medication} marked as taken!`);
    } catch (err: any) {
      console.error("Error in markTaken:", err);
      toast.error("Failed to mark as taken: " + (err?.message || "Unknown error"));
    }
  };

  const snooze = async (reminder: Reminder) => {
    const snoozeDuration = preferences.snooze_duration;
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + snoozeDuration);

    // Log the snooze
    await (supabase as any).from("reminder_logs").insert({
      patient_id: userId,
      medication_id: reminder.medicationId,
      scheduled_time: reminder.scheduledTime.toISOString(),
      actual_time: snoozeTime.toISOString(),
      status: "snoozed",
    });

    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, status: "snoozed" as const } : r))
    );

    toast.info(`Snoozed for ${snoozeDuration} minutes`);
    fetchHistory();
  };

  // Snooze for specific minutes
  const snoozeForMinutes = async (reminder: Reminder, minutes: number) => {
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

    // Log the snooze
    try {
      await (supabase as any).from("reminder_logs").insert({
        patient_id: userId,
        medication_id: reminder.medicationId,
        scheduled_time: reminder.scheduledTime.toISOString(),
        actual_time: snoozeTime.toISOString(),
        status: "snoozed",
      });
    } catch (e) {
      // Table might not exist
    }

    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, status: "snoozed" as const } : r))
    );

    toast.info(`Snoozed for ${minutes} minutes`);
    fetchHistory();
  };

  const updatePreferences = async (key: keyof UserPreferences, value: any) => {
    try {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);

      await (supabase as any)
        .from("user_preferences")
        .update({ [key]: value })
        .eq("user_id", userId!);

      toast.success("Preferences updated");
    } catch (err) {
      toast.error("Failed to update preferences");
    }
  };

  const requestRefill = async (medication: Medication) => {
    const medicationName = medication.medications?.name || "Medication";
    
    try {
      // Create refill request
      const { data: refillData, error: refillError } = await (supabase as any)
        .from("refill_requests")
        .insert({
          patient_id: userId,
          patient_medication_id: medication.id,
        })
        .select()
        .single();

      if (refillError) {
        console.error("Error creating refill request:", refillError);
        toast.error("Failed to request refill");
        return;
      }

      // Get caregivers for this patient and create notifications
      const { data: assignments, error: assignmentError } = await supabase
        .from("patient_assignments")
        .select("assigned_user_id")
        .eq("patient_id", userId);

      if (assignments && assignments.length > 0) {
        const caregiverIds = assignments.map((a: any) => a.assigned_user_id);
        
        // Create notifications for each caregiver
        const notifications = caregiverIds.map((caregiverId: string) => ({
          user_id: caregiverId,
          type: "refill_request",
          title: "Refill Request",
          message: `${medicationName} needs a refill for patient`,
          related_id: refillData.id,
        }));

        const { error: notifError } = await (supabase as any)
          .from("notifications")
          .insert(notifications);

        if (notifError) {
          console.error("Error creating notifications:", notifError);
        }

        // Also send refill request to chat/messages
        const messages = caregiverIds.map((caregiverId: string) => ({
          sender_id: userId,
          recipient_id: caregiverId,
          patient_id: userId,
          content: `🔄 Refill Request: ${medicationName} is running low and needs a refill.`,
          type: "refill_request",
          related_id: refillData.id,
        }));

        const { error: msgError } = await (supabase as any)
          .from("messages")
          .insert(messages);

        if (msgError) {
          console.error("Error creating chat message:", msgError);
        }
      }

      toast.success("Refill requested! Your care team has been notified.");
    } catch (err) {
      console.error("Error in requestRefill:", err);
      toast.error("Failed to request refill");
    }
  };

  // Self-refill: patient can add their own stock
  const selfRefill = async (medication: Medication) => {
    const medicationName = medication.medications?.name || "Medication";
    const refillAmount = medication.total_quantity || 30; // Default to original amount

    try {
      // Update the quantity by adding more stock
      const { error } = await supabase
        .from("patient_medications")
        .update({ quantity_remaining: refillAmount })
        .eq("id", medication.id);

      if (error) {
        console.error("Error in selfRefill:", error);
        toast.error("Failed to add stock");
        return;
      }

      toast.success(`${medicationName} restocked with ${refillAmount} pills!`);
      // Refresh reminders to show the medication again
      fetchReminders();
    } catch (err) {
      console.error("Error in selfRefill:", err);
      toast.error("Failed to add stock");
    }
  };

  const takenCount = filteredByDate.filter((r) => r.status === "taken").length;
  const totalCount = filteredByDate.length;
  const progress = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="font-display text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading..."
            : `${takenCount}/${totalCount} doses taken`}
        </p>
      </motion.div>



      {/* Refill Alerts */}
      {refillAlerts.length > 0 && (
        <motion.div variants={item} className="glass-card border-destructive/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive">Refill Needed</span>
          </div>
          <div className="space-y-2">
            {refillAlerts.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between rounded-lg bg-destructive/5 p-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {(med.medications as any)?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {med.quantity_remaining}/{med.total_quantity} remaining (
                    {Math.round((med.quantity_remaining! / med.total_quantity!) * 100)}%)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selfRefill(med)}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Self Refill
                  </button>
                  <button
                    onClick={() => requestRefill(med)}
                    className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    Request Refill
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Out of Stock Alert - Medications with 0 quantity */}
      {outOfStockMedications.length > 0 && (
        <motion.div variants={item} className="glass-card border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive">Out of Stock</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            These medications have no stock left. Reminders are hidden until refilled.
          </p>
          <div className="space-y-2">
            {outOfStockMedications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between rounded-lg bg-destructive/10 p-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {(med.medications as any)?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-destructive">
                    0/{med.total_quantity} remaining - Out of stock
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => selfRefill(med)}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    Self Refill
                  </button>
                  <button
                    onClick={() => requestRefill(med)}
                    className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                  >
                    Request Refill
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}



      {/* Reminder Cards - Today's reminders only */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading reminders...
        </div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <Timer className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-semibold">No reminders</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "all"
              ? "Add medications to see reminders"
              : `No ${filter} reminders`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => {
            const config = statusMap[reminder.status];
            const Icon = config.icon;
            const needsRefill =
              reminder.quantityRemaining !== undefined &&
              reminder.totalQuantity !== undefined &&
              reminder.quantityRemaining / reminder.totalQuantity < 0.2;

            return (
              <motion.div
                key={reminder.id}
                variants={item}
                className="glass-card-hover p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.badge}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {reminder.medication}{" "}
                      <span className="font-normal text-muted-foreground">
                        {reminder.dosage}
                      </span>
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {reminder.time}
                      {needsRefill && (
                        <span className="ml-2 flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Low supply
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${config.badge}`}
                  >
                    {config.label}
                  </span>
                </div>

                {(reminder.status === "pending" || reminder.status === "snoozed") && (
                  <div className="mt-3 flex gap-2 border-t border-white/[0.04] pt-3">
                    <button
                      onClick={() => {
                        if (reminder.status === "pending") {
                          setShowTimePicker(reminder.id);
                        } else {
                          markTaken(reminder);
                        }
                      }}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                      style={{ background: "var(--gradient-success)" }}
                    >
                      Mark as Taken
                    </button>
                    <button
                      onClick={() => snooze(reminder)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pause className="h-3 w-3" /> Snooze
                    </button>
                  </div>
                )}

                {/* Allow taking missed medication only for same day as selected date */}
                {reminder.status === "missed" && isSameDay(reminder.scheduledTime, selectedDate) && (
                  <div className="mt-3 flex gap-2 border-t border-white/[0.04] pt-3">
                    <button
                      onClick={() => markTaken(reminder)}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                      style={{ background: "var(--gradient-success)" }}
                    >
                      Take Now (Missed)
                    </button>
                  </div>
                )}

                {/* Show message for missed medications from other days */}
                {reminder.status === "missed" && !isSameDay(reminder.scheduledTime, selectedDate) && (
                  <div className="mt-3 border-t border-white/[0.04] pt-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Cannot take - different day
                    </p>
                  </div>
                )}

                {/* Show timestamp for late medications */}
                {(reminder.status === "late" || reminder.status === "taken") && reminder.takenAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Taken at: {format(reminder.takenAt, "h:mm a")}
                  </div>
                )}

                {/* Time Picker Modal */}
                <AnimatePresence>
                  {showTimePicker === reminder.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                      onClick={() => setShowTimePicker(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-card p-6"
                      >
                        <h3 className="mb-4 font-semibold">Select Time Taken</h3>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="glass-input mb-4 w-full"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowTimePicker(null)}
                            className="flex-1 rounded-xl py-2 text-sm font-medium text-muted-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const [hours, minutes] = customTime.split(":").map(Number);
                              const takenTime = new Date(reminder.scheduledTime);
                              takenTime.setHours(hours, minutes, 0, 0);
                              markTaken(reminder, takenTime);
                              setShowTimePicker(null);
                            }}
                            className="flex-1 rounded-xl py-2 text-sm font-semibold text-primary-foreground"
                            style={{ background: "var(--gradient-primary)" }}
                          >
                            Confirm
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* History Section */}
      <motion.div variants={item}>
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory) fetchHistory();
          }}
          className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Medication History</span>
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-4">
                {historyLogs.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No history yet. Start taking your medications to see your history.
                  </p>
                ) : (
                  // Group logs by date
                  (() => {
                    const groupedByDate: Record<string, typeof historyLogs> = {};
                    historyLogs.forEach((log) => {
                      const dateKey = format(parseISO(log.scheduled_time), "yyyy-MM-dd");
                      if (!groupedByDate[dateKey]) {
                        groupedByDate[dateKey] = [];
                      }
                      groupedByDate[dateKey].push(log);
                    });
                    
                    return Object.entries(groupedByDate).map(([dateKey, logs]) => {
                      const dateLabel = isSameDay(parseISO(dateKey), new Date()) 
                        ? "Today" 
                        : isSameDay(parseISO(dateKey), new Date(Date.now() - 86400000))
                          ? "Yesterday"
                          : format(parseISO(dateKey), "EEEE, MMM d");
                      
                      const takenCount = logs.filter(l => l.status === "taken" || l.status === "late" || l.status === "early").length;
                      const totalCount = logs.length;
                      
                      return (
                        <div key={dateKey}>
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                            <span className="text-sm font-medium text-foreground">{dateLabel}</span>
                            <span className="text-xs text-muted-foreground">
                              {takenCount}/{totalCount} taken
                            </span>
                          </div>
                          <div className="space-y-2">
                            {logs.map((log) => {
                              const config = statusMap[log.status as keyof typeof statusMap] || statusMap.pending;
                              const Icon = config.icon;
                              const timeDiff = log.actual_time 
                                ? new Date(log.actual_time).getTime() - new Date(log.scheduled_time).getTime()
                                : 0;
                              const minutesDiff = Math.round(timeDiff / 60000);
                              const timeDiffText = minutesDiff > 0 
                                ? `+${minutesDiff}min` 
                                : minutesDiff < 0 
                                  ? `${minutesDiff}min` 
                                  : "on time";
                              
                              return (
                                <div
                                  key={log.id}
                                  className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3"
                                >
                                  <Icon className={`h-4 w-4 ${config.badge.split(" ")[1]}`} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {log.medication_name}
                                      {(log as any).dosage && <span className="text-muted-foreground ml-1">({(log as any).dosage})</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Scheduled: {format(parseISO(log.scheduled_time), "h:mm a")}
                                      {log.actual_time && (
                                        <span className="ml-2">
                                          | Taken: {format(parseISO(log.actual_time), "h:mm a")} ({timeDiffText})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${config.badge}`}>
                                    {config.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default Reminders;
