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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_email: string
          author_id: string | null
          author_name: string
          categories: string[]
          created_at: string
          id: string
          team_id: string
          text: string
          when: string
        }
        Insert: {
          author_email?: string
          author_id?: string | null
          author_name?: string
          categories?: string[]
          created_at?: string
          id?: string
          team_id: string
          text: string
          when?: string
        }
        Update: {
          author_email?: string
          author_id?: string | null
          author_name?: string
          categories?: string[]
          created_at?: string
          id?: string
          team_id?: string
          text?: string
          when?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          event_id: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          reason?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_email: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_email: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_email?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          attendance_deadline: string | null
          categories: string[]
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          items: string | null
          location: string | null
          meeting_time: string | null
          notes: string | null
          opponent: string | null
          rain_cancel: boolean
          start_time: string | null
          team_id: string
          title: string
          updated_at: string
          warmup_time: string | null
        }
        Insert: {
          attendance_deadline?: string | null
          categories?: string[]
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type?: string
          id?: string
          items?: string | null
          location?: string | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          rain_cancel?: boolean
          start_time?: string | null
          team_id: string
          title?: string
          updated_at?: string
          warmup_time?: string | null
        }
        Update: {
          attendance_deadline?: string | null
          categories?: string[]
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          items?: string | null
          location?: string | null
          meeting_time?: string | null
          notes?: string | null
          opponent?: string | null
          rain_cancel?: boolean
          start_time?: string | null
          team_id?: string
          title?: string
          updated_at?: string
          warmup_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_items: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          team_id: string
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          team_id: string
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          item_id: string
          paid: boolean
          paid_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          item_id: string
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          item_id?: string
          paid?: boolean
          paid_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "finance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string
          email: string
          id: string
          name: string
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          email: string
          id: string
          name?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          author_email: string
          created_at: string
          id: string
          kind: string | null
          post_id: string
          reporter_email: string
          reporter_id: string
          team_id: string | null
          text: string
        }
        Insert: {
          author_email: string
          created_at?: string
          id?: string
          kind?: string | null
          post_id: string
          reporter_email: string
          reporter_id: string
          team_id?: string | null
          text: string
        }
        Update: {
          author_email?: string
          created_at?: string
          id?: string
          kind?: string | null
          post_id?: string
          reporter_email?: string
          reporter_id?: string
          team_id?: string | null
          text?: string
        }
        Relationships: []
      }
      team_categories: {
        Row: {
          id: string
          label: string
          slug: string
          sort_order: number
          team_id: string
        }
        Insert: {
          id?: string
          label: string
          slug: string
          sort_order?: number
          team_id: string
        }
        Update: {
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_event_types: {
        Row: {
          id: string
          label: string
          sort_order: number
          team_id: string
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number
          team_id: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_event_types_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          name_normalized: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_normalized: string
          password_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_normalized?: string
          password_hash?: string
        }
        Relationships: []
      }
      wakeups: {
        Row: {
          created_at: string
          team_id: string
          user_id: string
          wake_date: string
        }
        Insert: {
          created_at?: string
          team_id: string
          user_id: string
          wake_date: string
        }
        Update: {
          created_at?: string
          team_id?: string
          user_id?: string
          wake_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wakeups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_team: {
        Args: { _name: string; _password: string }
        Returns: string
      }
      get_my_team_id: { Args: never; Returns: string }
      is_team_leader: { Args: { _user: string }; Returns: boolean }
      join_team: { Args: { _name: string; _password: string }; Returns: string }
      seed_team_defaults: { Args: { _team: string }; Returns: undefined }
    }
    Enums: {
      app_role: "captain" | "manager" | "staff" | "exec" | "member" | "student"
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
      app_role: ["captain", "manager", "staff", "exec", "member", "student"],
    },
  },
} as const
