export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      medications: {
        Row: {
          created_at: string
          description: string | null
          generic_name: string | null
          id: string
          manufacturer: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
        }
        Relationships: []
      }
      patient_assignments: {
        Row: {
          assigned_user_id: string
          assignment_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          id: string
          patient_id: string
          permissions: string[] | null
        }
        Insert: {
          assigned_user_id: string
          assignment_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          patient_id: string
          permissions?: string[] | null
        }
        Update: {
          assigned_user_id?: string
          assignment_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          id?: string
          patient_id?: string
          permissions?: string[] | null
        }
        Relationships: []
      }
      patient_medications: {
        Row: {
          added_by: string | null
          created_at: string
          dosage: string
          end_date: string | null
          form: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication_id: string
          notes: string | null
          patient_id: string
          pharmacy_name: string | null
          prescriber_name: string | null
          quantity_remaining: number | null
          refills_remaining: number | null
          start_date: string | null
          status: string | null
          times: string[] | null
          total_quantity: number | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          dosage?: string
          end_date?: string | null
          form?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id: string
          notes?: string | null
          patient_id: string
          pharmacy_name?: string | null
          prescriber_name?: string | null
          quantity_remaining?: number | null
          refills_remaining?: number | null
          start_date?: string | null
          status?: string | null
          times?: string[] | null
          total_quantity?: number | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          dosage?: string
          end_date?: string | null
          form?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string
          notes?: string | null
          patient_id?: string
          pharmacy_name?: string | null
          prescriber_name?: string | null
          quantity_remaining?: number | null
          refills_remaining?: number | null
          start_date?: string | null
          status?: string | null
          times?: string[] | null
          total_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          patient_medication_id: string
          scheduled_time: string
          snoozed_until: string | null
          status: string | null
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          patient_medication_id: string
          scheduled_time: string
          snoozed_until?: string | null
          status?: string | null
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          patient_medication_id?: string
          scheduled_time?: string
          snoozed_until?: string | null
          status?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_patient_medication_id_fkey"
            columns: ["patient_medication_id"]
            isOneToOne: false
            referencedRelation: "patient_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      refill_requests: {
        Row: {
          created_at: string
          id: string
          medication_name: string | null
          notes: string | null
          patient_id: string
          patient_medication_id: string
          quantity: number | null
          requested_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_name?: string | null
          notes?: string | null
          patient_id: string
          patient_medication_id: string
          quantity?: number | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_name?: string | null
          notes?: string | null
          patient_id?: string
          patient_medication_id?: string
          quantity?: number | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refill_requests_patient_medication_id_fkey"
            columns: ["patient_medication_id"]
            isOneToOne: false
            referencedRelation: "patient_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          patient_id: string
          recipient_id: string
          sender_id: string
          type: string | null
          related_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          patient_id: string
          recipient_id: string
          sender_id: string
          type?: string | null
          related_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          patient_id?: string
          recipient_id?: string
          sender_id?: string
          type?: string | null
          related_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          password_hash: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          password_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          username: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "caregiver" | "pharmacist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "caregiver", "pharmacist"],
    },
  },
} as const
