import { motion } from "framer-motion";
import {
  Pill,
  Plus,
  MoreVertical,
  RefreshCw,
  Clock,
  AlertCircle,
  Trash2,
  History,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AddMedicationDialog from "@/components/Medications/AddMedicationDialog";
import medMinderLogo from "@/../public/masked-icon.svg";

interface MedicationHistory {
  id: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  details: any;
  previous_quantity: number | null;
  new_quantity: number | null;
  medication_name?: string;
}

interface Medication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  form: string;
  frequency: string;
  times: string[];
  refillsLeft: number;
  totalQty: number;
  remainingQty: number;
  prescriber: string;
  pharmacyName: string;
  status: "active" | "completed" | "discontinued";
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Medications = () => {
  const { userId, profile } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [history, setHistory] = useState<MedicationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "low">("all");
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [requestingRefill, setRequestingRefill] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchMedications = async () => {
    if (!userId) return;
    setLoading(true);

    const { data: patientMeds, error } = await supabase
      .from("patient_medications")
      .select(`
        id,
        dosage,
        form,
        frequency,
        times,
        status,
        refills_remaining,
        quantity_remaining,
        total_quantity,
        prescriber_name,
        pharmacy_name,
        medication_id,
        medications(name, generic_name)
      `)
      .eq("patient_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching medications:", error);
      setLoading(false);
      return;
    }

    const mappedMeds: Medication[] = (patientMeds || []).map((med: any) => ({
      id: med.id,
      name: med.medications?.name || "Unknown",
      genericName: med.medications?.generic_name || "",
      dosage: med.dosage,
      form: med.form || "Tablet",
      frequency: med.frequency || "Once daily",
      times: med.times || [],
      refillsLeft: med.refills_remaining || 0,
      totalQty: med.total_quantity || 0,
      remainingQty: med.quantity_remaining || 0,
      prescriber: med.prescriber_name || "",
      pharmacyName: med.pharmacy_name || "",
      status: med.status || "active",
    }));

    setMedications(mappedMeds);
    setLoading(false);
  };

  const fetchHistory = async () => {
    if (!userId) return;
    setHistoryLoading(true);
    
    try {
      // First get all patient medications for this user
      const { data: patientMeds } = await supabase
        .from("patient_medications")
        .select("id")
        .eq("patient_id", userId);

      if (!patientMeds || patientMeds.length === 0) {
        setHistory([]);
        setHistoryLoading(false);
        return;
      }

      const medIds = patientMeds.map(m => m.id);

      // Then get history for those medications
      const { data, error } = await supabase
        .from("medication_history")
        .select(`
          *,
          patient_medications(
            medication_id,
            medications(name)
          )
        `)
        .in("patient_medication_id", medIds)
        .order("performed_at", { ascending: false });

      if (error) {
        console.error("Error fetching history:", error);
        setHistory([]);
      } else {
        const mappedHistory = (data || []).map((h: any) => ({
          ...h,
          medication_name: h.patient_medications?.medications?.name || "Unknown",
        }));
        setHistory(mappedHistory);
      }
    } catch (err) {
      console.error("Error in fetchHistory:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
    fetchHistory();
  }, [userId]);

  const handleRequestRefill = async (medicationId: string, medicationName: string, quantity: number) => {
    if (!userId) return;
    setRequestingRefill(medicationId);

    try {
      const { data: existing } = await supabase
        .from("refill_requests")
        .select("id")
        .eq("patient_medication_id", medicationId)
        .eq("patient_id", userId)
        .eq("status", "pending")
        .single();

      if (existing) {
        toast.warning("You already have a pending refill request for this medication");
        setRequestingRefill(null);
        return;
      }

      const { error } = await supabase.from("refill_requests").insert({
        patient_id: userId,
        patient_medication_id: medicationId,
        requested_by: userId,
        status: "pending",
        medication_name: medicationName,
        quantity: quantity,
      });

      if (error) {
        toast.error("Failed to request refill: " + error.message);
      } else {
        toast.success(`Refill request submitted for ${medicationName} (${quantity} units)`);
      }
    } catch (err) {
      toast.error("An error occurred while requesting refill");
    } finally {
      setRequestingRefill(null);
    }
  };

  const handleDeleteMedication = async (medicationId: string, medicationName: string) => {
    if (profile?.role === "caregiver" || profile?.role === "pharmacist") {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${medicationName}? This will remove all reminders for this medication.`
      );
      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from("patient_medications")
          .delete()
          .eq("id", medicationId);

        if (error) {
          toast.error("Failed to delete medication: " + error.message);
          return;
        }

        toast.success(`${medicationName} deleted!`);
        fetchMedications();
        fetchHistory();
      } catch (err) {
        toast.error("Failed to delete medication");
      }
      return;
    }

    const confirmed = window.confirm(
      `Your request to delete ${medicationName} will be sent to your caregiver and pharmacist for approval.`
    );
    if (!confirmed) return;

    try {
      const { data: patientAssignments } = await supabase
        .from("patient_assignments")
        .select("assigned_user_id, assignment_role")
        .eq("patient_id", userId);

      if (!patientAssignments || patientAssignments.length === 0) {
        toast.error("No caregiver or pharmacist assigned to send request to");
        return;
      }

      const caregiversAndPharmacists = patientAssignments.filter(
        (a) => a.assignment_role === "caregiver" || a.assignment_role === "pharmacist"
      );

      if (caregiversAndPharmacists.length === 0) {
        toast.error("No caregiver or pharmacist assigned to send request to");
        return;
      }

      const recipientIds = caregiversAndPharmacists.map((a) => a.assigned_user_id);
      
      const messages = recipientIds.map((recipientId) => ({
        sender_id: userId,
        recipient_id: recipientId,
        patient_id: userId,
        content: `Request to delete medication: ${medicationName}`,
        type: "delete_request",
        related_id: medicationId,
      }));

      const { error } = await supabase.from("messages").insert(messages);

      if (error) {
        toast.error("Failed to send delete request: " + error.message);
        return;
      }

      toast.success(`Delete request for ${medicationName} sent to caregiver and pharmacist`);
    } catch (err) {
      toast.error("Failed to send delete request");
    }
  };

  const filtered = medications.filter((med) => {
    if (filter === "active") return med.status === "active";
    if (filter === "low") return med.totalQty > 0 && med.remainingQty / med.totalQty < 0.2;
    return true;
  });

  const activeCount = medications.filter(m => m.status === "active").length;
  const lowSupplyCount = medications.filter(m => m.totalQty > 0 && m.remainingQty / m.totalQty < 0.2).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={medMinderLogo} alt="Med-Minder" className="h-10 w-10 rounded-xl" />
          <div>
            <h1 className="font-display text-2xl font-bold">Medications</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${activeCount} active medications`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAddMedOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="h-4 w-4" /> Add
        </button>
        {medications.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground border border-white/[0.08] bg-white/[0.03]"
          >
            <History className="h-4 w-4" /> History
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-2">
        {(["all", "active", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`nav-pill ${filter === f ? "active" : ""}`}
          >
            {f === "low" ? `Low Supply (${lowSupplyCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Medication Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading medications...</div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <Pill className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-semibold">No medications found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "all" 
              ? "Add your first medication to get started" 
              : `No ${filter} medications`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((med) => {
            const supplyPct = med.totalQty > 0 ? (med.remainingQty / med.totalQty) * 100 : 0;
            const isLow = supplyPct < 20;
            const canRequestRefill = med.refillsLeft > 0 && isLow;
            
            return (
              <motion.div
                key={med.id}
                variants={item}
                className="glass-card-hover p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Pill className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        {med.name}{" "}
                        <span className="text-muted-foreground">{med.dosage}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">{med.genericName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Clock className="h-3 w-3" /> {med.frequency}
                        </span>
                        <span className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {med.form}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                {/* Supply Bar */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Supply: {med.remainingQty}/{med.totalQty}
                    </span>
                    {isLow && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <AlertCircle className="h-3 w-3" /> Low supply
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${supplyPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        isLow ? "bg-destructive" : "bg-primary"
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
                  <span className="text-xs text-muted-foreground">
                    {med.refillsLeft} refills left · {med.prescriber || "No prescriber"}
                    {med.pharmacyName && ` · ${med.pharmacyName}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDeleteMedication(med.id, med.name)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> {profile?.role === "patient" ? "Request Delete" : "Delete"}
                    </button>
                    <button 
                      onClick={() => handleRequestRefill(med.id, med.name, med.totalQty)}
                      disabled={requestingRefill === med.id || med.refillsLeft === 0}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-3 w-3 ${requestingRefill === med.id ? "animate-spin" : ""}`} /> 
                      {requestingRefill === med.id ? "Requesting..." : "Request Refill"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddMedicationDialog
        open={addMedOpen}
        onOpenChange={setAddMedOpen}
        patientId={userId}
        onSuccess={() => {
          fetchMedications();
          fetchHistory();
        }}
      />

      {/* Medication History Section */}
      {showHistory && (
        <motion.div 
          variants={item}
          className="glass-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" /> Medication History
            </h3>
            <button 
              onClick={() => setShowHistory(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          
          {historyLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No medication history yet
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div 
                  key={h.id} 
                  className="flex items-center justify-between border-b border-white/[0.04] pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{h.medication_name || "Unknown Medication"}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.action === 'added' && 'Added'}
                      {h.action === 'deleted' && 'Deleted'}
                      {h.action === 'supply_depleted' && 'Supply Depleted'}
                      {h.action === 'refill' && 'Refill Requested'}
                      {h.action === 'status_changed' && 'Status Changed'}
                      {h.performed_by && ` by ${h.performed_by}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.performed_at).toLocaleDateString()}
                    </p>
                    {h.action === 'supply_depleted' && h.performed_at && (
                      <p className="text-xs text-warning">
                        Depleted: {new Date(h.performed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Medications;
