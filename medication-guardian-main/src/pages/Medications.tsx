import { motion } from "framer-motion";
import {
  Pill,
  Plus,
  MoreVertical,
  RefreshCw,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AddMedicationDialog from "@/components/Medications/AddMedicationDialog";

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
  const { userId } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "low">("all");
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [requestingRefill, setRequestingRefill] = useState<string | null>(null);

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

  useEffect(() => {
    fetchMedications();
  }, [userId]);

  const handleRequestRefill = async (medicationId: string) => {
    if (!userId) return;
    setRequestingRefill(medicationId);

    try {
      // Check if there's already a pending refill request
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
      });

      if (error) {
        toast.error("Failed to request refill: " + error.message);
      } else {
        toast.success("Refill request submitted successfully!");
      }
    } catch (err) {
      toast.error("An error occurred while requesting refill");
    } finally {
      setRequestingRefill(null);
    }
  };

  const handleDeleteMedication = async (medicationId: string, medicationName: string) => {
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
    } catch (err) {
      toast.error("Failed to delete medication");
    }
  };

  const filtered = medications.filter((med) => {
    if (filter === "active") return med.status === "active";
    if (filter === "low") return med.remainingQty / med.totalQty < 0.2;
    return true;
  });

  const activeCount = medications.filter(m => m.status === "active").length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Medications</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${activeCount} active medications`}
          </p>
        </div>
        <button
          onClick={() => setAddMedOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-2">
        {(["all", "active", "low"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`nav-pill ${filter === f ? "active" : ""}`}
          >
            {f === "low" ? "Low Supply" : f.charAt(0).toUpperCase() + f.slice(1)}
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
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                    <button 
                      onClick={() => handleRequestRefill(med.id)}
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
        onSuccess={fetchMedications}
      />
    </motion.div>
  );
};

export default Medications;
