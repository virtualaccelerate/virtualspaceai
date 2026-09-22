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
      activity_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          kind: string
          meta: Json | null
          path: string | null
          teamspace_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          kind: string
          meta?: Json | null
          path?: string | null
          teamspace_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          kind?: string
          meta?: Json | null
          path?: string | null
          teamspace_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_notification_log: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          importance: string
          kind: string
          teamspace_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          importance?: string
          kind: string
          teamspace_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          importance?: string
          kind?: string
          teamspace_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
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
          extract_error: string | null
          extract_status: string
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
          extract_error?: string | null
          extract_status?: string
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
          extract_error?: string | null
          extract_status?: string
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
      google_calendar_links: {
        Row: {
          calendar_id: string
          created_at: string
          etag: string | null
          event_id: string
          event_updated_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          created_at?: string
          etag?: string | null
          event_id: string
          event_updated_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          etag?: string | null
          event_id?: string
          event_updated_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_settings: {
        Row: {
          calendar_id: string
          calendar_name: string | null
          created_at: string
          last_error: string | null
          last_sync_at: string | null
          reconnect_required: boolean
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          last_error?: string | null
          last_sync_at?: string | null
          reconnect_required?: boolean
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          last_error?: string | null
          last_sync_at?: string | null
          reconnect_required?: boolean
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          task_id: string | null
          teamspace_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          task_id?: string | null
          teamspace_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          task_id?: string | null
          teamspace_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_members: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          linked_user_id: string | null
          name: string
          source: string
          teamspace_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name: string
          source?: string
          teamspace_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          linked_user_id?: string | null
          name?: string
          source?: string
          teamspace_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_members_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
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
      task_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          field: string | null
          from_value: string | null
          id: string
          kind: string
          note: string | null
          source: string
          task_id: string
          teamspace_id: string | null
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          field?: string | null
          from_value?: string | null
          id?: string
          kind: string
          note?: string | null
          source?: string
          task_id: string
          teamspace_id?: string | null
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          field?: string | null
          from_value?: string | null
          id?: string
          kind?: string
          note?: string | null
          source?: string
          task_id?: string
          teamspace_id?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reminders: {
        Row: {
          id: string
          kind: string
          sent_at: string
          task_id: string
        }
        Insert: {
          id?: string
          kind: string
          sent_at?: string
          task_id: string
        }
        Update: {
          id?: string
          kind?: string
          sent_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_sync_sources: {
        Row: {
          api_key_ciphertext: string
          column_map: Json
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          last_error: string | null
          last_sync_at: string | null
          project_id: string | null
          project_name: string | null
          provider: string
          teamspace_id: string
          updated_at: string
          user_map: Json
          webhook_id: string | null
          webhook_secret: string
        }
        Insert: {
          api_key_ciphertext: string
          column_map?: Json
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          project_id?: string | null
          project_name?: string | null
          provider: string
          teamspace_id: string
          updated_at?: string
          user_map?: Json
          webhook_id?: string | null
          webhook_secret: string
        }
        Update: {
          api_key_ciphertext?: string
          column_map?: Json
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          project_id?: string | null
          project_name?: string | null
          provider?: string
          teamspace_id?: string
          updated_at?: string
          user_map?: Json
          webhook_id?: string | null
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_sync_sources_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          department: string | null
          description: string | null
          due_date: string | null
          external_archived: boolean
          external_board: string | null
          external_column_id: string | null
          external_id: string | null
          external_project: string | null
          external_source: string | null
          external_updated_at: string | null
          external_url: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          project: string | null
          proof_note: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["task_status"]
          status_id: string | null
          submitted_at: string | null
          teamspace_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          external_archived?: boolean
          external_board?: string | null
          external_column_id?: string | null
          external_id?: string | null
          external_project?: string | null
          external_source?: string | null
          external_updated_at?: string | null
          external_url?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          status_id?: string | null
          submitted_at?: string | null
          teamspace_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          external_archived?: boolean
          external_board?: string | null
          external_column_id?: string | null
          external_id?: string | null
          external_project?: string | null
          external_source?: string | null
          external_updated_at?: string | null
          external_url?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          proof_note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          status_id?: string | null
          submitted_at?: string | null
          teamspace_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "teamspace_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_teamspace_id_fkey"
            columns: ["teamspace_id"]
            isOneToOne: false
            referencedRelation: "teamspaces"
            referencedColumns: ["id"]
          },
        ]
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
      teamspace_statuses: {
        Row: {
          base_status: Database["public"]["Enums"]["task_status"]
          created_at: string
          external_column_id: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          source: string | null
          teamspace_id: string
        }
        Insert: {
          base_status?: Database["public"]["Enums"]["task_status"]
          created_at?: string
          external_column_id?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          source?: string | null
          teamspace_id: string
        }
        Update: {
          base_status?: Database["public"]["Enums"]["task_status"]
          created_at?: string
          external_column_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          source?: string | null
          teamspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teamspace_statuses_teamspace_id_fkey"
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
          logo_path: string | null
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
          logo_path?: string | null
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
          logo_path?: string | null
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
          pending_proof_task_id: string | null
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
          pending_proof_task_id?: string | null
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
          pending_proof_task_id?: string | null
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
      documents_index_status: {
        Args: { p_teamspace: string }
        Returns: {
          extract_error: string
          extract_status: string
          id: string
          text_len: number
        }[]
      }
      join_teamspace_by_code: { Args: { _code: string }; Returns: string }
      send_daily_task_digest: { Args: never; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
