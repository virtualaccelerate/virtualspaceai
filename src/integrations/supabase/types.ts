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
      app_user_connections: {
        Row: {
          account_email: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          teamspace_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          teamspace_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          teamspace_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          tasks: Json | null
          teamspace_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          tasks?: Json | null
          teamspace_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          tasks?: Json | null
          teamspace_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string
          email: string | null
          id: string
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          course_id: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          currency: string
          description: string
          description_ru: string | null
          duration: string
          finik_payment_url: string | null
          id: string
          lessons_count: number
          level: string
          position: number
          price: number
          published: boolean
          title: string
          title_ru: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          description_ru?: string | null
          duration?: string
          finik_payment_url?: string | null
          id?: string
          lessons_count?: number
          level?: string
          position?: number
          price?: number
          published?: boolean
          title: string
          title_ru?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          description_ru?: string | null
          duration?: string
          finik_payment_url?: string | null
          id?: string
          lessons_count?: number
          level?: string
          position?: number
          price?: number
          published?: boolean
          title?: string
          title_ru?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string | null
          contact: string
          created_at: string
          id: string
          language: string | null
          name: string
          user_agent: string | null
        }
        Insert: {
          company?: string | null
          contact: string
          created_at?: string
          id?: string
          language?: string | null
          name: string
          user_agent?: string | null
        }
        Update: {
          company?: string | null
          contact?: string
          created_at?: string
          id?: string
          language?: string | null
          name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          teamspace_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          teamspace_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          teamspace_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          teamspace_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          teamspace_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          teamspace_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_chat_messages_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_sources: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          kind: string
          name: string
          raw_csv: string | null
          source_url: string | null
          teamspace_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          kind: string
          name: string
          raw_csv?: string | null
          source_url?: string | null
          teamspace_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          raw_csv?: string | null
          source_url?: string | null
          teamspace_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_sources_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          achievements: string
          booking_url: string | null
          company: string
          created_at: string
          currency: string
          experience: string
          expertise: string[]
          full_bio: string
          full_name: string
          hourly_rate: number | null
          id: string
          industries: string[]
          languages: string[]
          photo_url: string | null
          position: number
          published: boolean
          role_title: string
          short_bio: string
          topics: string
          updated_at: string
        }
        Insert: {
          achievements?: string
          booking_url?: string | null
          company?: string
          created_at?: string
          currency?: string
          experience?: string
          expertise?: string[]
          full_bio?: string
          full_name: string
          hourly_rate?: number | null
          id?: string
          industries?: string[]
          languages?: string[]
          photo_url?: string | null
          position?: number
          published?: boolean
          role_title?: string
          short_bio?: string
          topics?: string
          updated_at?: string
        }
        Update: {
          achievements?: string
          booking_url?: string | null
          company?: string
          created_at?: string
          currency?: string
          experience?: string
          expertise?: string[]
          full_bio?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          industries?: string[]
          languages?: string[]
          photo_url?: string | null
          position?: number
          published?: boolean
          role_title?: string
          short_bio?: string
          topics?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          calendar_token: string
          company: string | null
          created_at: string
          current_teamspace_id: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          calendar_token?: string
          company?: string | null
          created_at?: string
          current_teamspace_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          calendar_token?: string
          company?: string | null
          created_at?: string
          current_teamspace_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_teamspace_id_fkey"
            columns: ["current_teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          created_at: string
          cta_label: string | null
          description: string
          description_ru: string | null
          id: string
          image_url: string | null
          name: string
          position: number
          published: boolean
          tags: string[]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          description?: string
          description_ru?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number
          published?: boolean
          tags?: string[]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          description?: string
          description_ru?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          published?: boolean
          tags?: string[]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_name: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teamspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          teamspace_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          teamspace_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          teamspace_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamspace_members_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      teamspaces: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          team_size: Database["public"]["Enums"]["team_size"]
          updated_at: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["business_type"]
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          team_size: Database["public"]["Enums"]["team_size"]
          updated_at?: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          team_size?: Database["public"]["Enums"]["team_size"]
          updated_at?: string
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          chat_id: number | null
          created_at: string
          daily_digest: boolean
          digest_hour: number
          id: string
          language: string | null
          link_code: string
          linked_at: string | null
          teamspace_id: string | null
          telegram_username: string | null
          user_id: string
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          daily_digest?: boolean
          digest_hour?: number
          id?: string
          language?: string | null
          link_code?: string
          linked_at?: string | null
          teamspace_id?: string | null
          telegram_username?: string | null
          user_id: string
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          daily_digest?: boolean
          digest_hour?: number
          id?: string
          language?: string | null
          link_code?: string
          linked_at?: string | null
          teamspace_id?: string | null
          telegram_username?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_links_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_updates: {
        Row: {
          created_at: string
          update_id: number
        }
        Insert: {
          created_at?: string
          update_id: number
        }
        Update: {
          created_at?: string
          update_id?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_teamspace_member: {
        Args: { _ts: string; _uid: string }
        Returns: boolean
      }
      is_teamspace_owner: {
        Args: { _ts: string; _uid: string }
        Returns: boolean
      }
      join_teamspace_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      business_type: "startup" | "agency" | "company"
      member_role: "owner" | "admin" | "member"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "backlog" | "in_progress" | "review" | "done"
      team_size: "0-50" | "50-100" | "100+" | "1-5" | "5-20" | "20+"
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
      app_role: ["admin", "user"],
      business_type: ["startup", "agency", "company"],
      member_role: ["owner", "admin", "member"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["backlog", "in_progress", "review", "done"],
      team_size: ["0-50", "50-100", "100+", "1-5", "5-20", "20+"],
    },
  },
} as const
