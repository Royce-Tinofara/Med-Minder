import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
  onSuccess: () => void;
}

const AddMedicationDialog = ({ open, onOpenChange, patientId, onSuccess }: AddMedicationDialogProps) => {
  const { profile } = useAuth();
  
  // Form fields
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [form, setForm] = useState("Tablet");
  const [instructions, setInstructions] = useState("");
  const [totalQty, setTotalQty] = useState("30");
  const [refills, setRefills] = useState("0");
  const [prescriberName, setPrescriberName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!medicationName || !patientId) return;
    setIsSubmitting(true);

    try {
      // First, create or get the medication from the catalog
      let medicationId: string;
      
      // Check if medication exists in catalog
      const { data: existingMed } = await supabase
        .from("medications")
        .select("id")
        .ilike("name", medicationName)
        .single();

      if (existingMed) {
        medicationId = existingMed.id;
      } else {
        // Create new medication in catalog
        const { data: newMed, error: medError } = await supabase
          .from("medications")
          .insert({ name: medicationName })
          .select("id")
          .single();

        if (medError || !newMed) {
          toast.error("Failed to add medication to catalog");
          setIsSubmitting(false);
          return;
        }
        medicationId = newMed.id;
      }

      // Combine pharmacy details
      const pharmacyDetails = [pharmacyName, pharmacyAddress, pharmacyPhone].filter(Boolean).join(" | ");

      // Insert patient medication
      const { error } = await supabase.from("patient_medications").insert({
        patient_id: patientId,
        medication_id: medicationId,
        dosage: dosage || "As prescribed",
        frequency,
        form,
        instructions,
        times: times.filter(t => t),
        total_quantity: parseInt(totalQty) || 30,
        quantity_remaining: parseInt(totalQty) || 30,
        refills_remaining: parseInt(refills) || 0,
        prescriber_name: prescriberName,
        pharmacy_name: pharmacyDetails || pharmacyName,
        status: "active",
        created_by: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : "Patient",
      });

      if (error) {
        toast.error("Failed to add medication: " + error.message);
      } else {
        toast.success("Medication added successfully!");
        onOpenChange(false);
        resetForm();
        onSuccess();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMedicationName("");
    setDosage("");
    setFrequency("Once daily");
    setForm("Tablet");
    setInstructions("");
    setTotalQty("30");
    setRefills("0");
    setPrescriberName("");
    setPharmacyName("");
    setPharmacyAddress("");
    setPharmacyPhone("");
    setTimes(["08:00"]);
  };

  const addTime = () => {
    setTimes([...times, "08:00"]);
  };

  const removeTime = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-card p-6 sm:rounded-2xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Add Medication</h2>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Medication Name - simple text input */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Medication Name</label>
              <input 
                value={medicationName} 
                onChange={(e) => setMedicationName(e.target.value)} 
                placeholder="e.g., Aspirin, Metformin" 
                className="glass-input w-full" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Dosage</label>
                <input 
                  value={dosage} 
                  onChange={(e) => setDosage(e.target.value)} 
                  placeholder="500mg" 
                  className="glass-input w-full" 
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Form</label>
                <select 
                  value={form} 
                  onChange={(e) => setForm(e.target.value)} 
                  className="glass-input w-full"
                >
                  <option>Tablet</option>
                  <option>Capsule</option>
                  <option>Liquid</option>
                  <option>Injection</option>
                  <option>Inhaler</option>
                  <option>Patch</option>
                  <option>Drops</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Frequency</label>
              <select 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value)} 
                className="glass-input w-full"
              >
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>Three times daily</option>
                <option>Four times daily</option>
                <option>Once weekly</option>
                <option>As needed</option>
              </select>
            </div>

            {/* Medication Times */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Reminder Times</label>
              <div className="space-y-2">
                {times.map((time, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="glass-input flex-1"
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTime(index)}
                        className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTime}
                  className="text-xs text-primary hover:underline"
                >
                  + Add another time
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Total Quantity</label>
                <input 
                  type="number" 
                  value={totalQty} 
                  onChange={(e) => setTotalQty(e.target.value)} 
                  className="glass-input w-full" 
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Refills</label>
                <input 
                  type="number" 
                  value={refills} 
                  onChange={(e) => setRefills(e.target.value)} 
                  className="glass-input w-full" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Prescriber</label>
                <input 
                  value={prescriberName} 
                  onChange={(e) => setPrescriberName(e.target.value)} 
                  placeholder="Dr. Smith" 
                  className="glass-input w-full" 
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Pharmacy Name</label>
                <input 
                  value={pharmacyName} 
                  onChange={(e) => setPharmacyName(e.target.value)} 
                  placeholder="CVS Pharmacy" 
                  className="glass-input w-full" 
                />
              </div>
            </div>

            {/* Pharmacy Details Section */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Pharmacy Details
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
                <input 
                  value={pharmacyAddress} 
                  onChange={(e) => setPharmacyAddress(e.target.value)} 
                  placeholder="123 Main St, City, State" 
                  className="glass-input w-full" 
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                <input 
                  value={pharmacyPhone} 
                  onChange={(e) => setPharmacyPhone(e.target.value)} 
                  placeholder="(555) 123-4567" 
                  className="glass-input w-full" 
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Instructions</label>
              <textarea 
                value={instructions} 
                onChange={(e) => setInstructions(e.target.value)} 
                placeholder="Take with food..." 
                rows={2} 
                className="glass-input w-full resize-none" 
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !medicationName}
              className="w-full rounded-xl py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {isSubmitting ? "Adding..." : "Add Medication"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddMedicationDialog;
