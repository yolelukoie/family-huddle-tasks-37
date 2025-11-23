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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          description: string
          id: string
          image_path: string
          name: string
          stage: number
          unlock_stars: number
        }
        Insert: {
          description: string
          id: string
          image_path: string
          name: string
          stage: number
          unlock_stars: number
        }
        Update: {
          description?: string
          id?: string
          image_path?: string
          name?: string
          stage?: number
          unlock_stars?: number
        }
        Relationships: []
      }
      celebration_events: {
        Row: {
          event_id: string
          family_id: string
          id: string
          seen: boolean
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          event_id: string
          family_id: string
          id?: string
          seen?: boolean
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          event_id?: string
          family_id?: string
          id?: string
          seen?: boolean
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celebration_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      character_stages: {
        Row: {
          name: string
          required_stars: number
          stage: number
        }
        Insert: {
          name: string
          required_stars: number
          stage: number
        }
        Update: {
          name?: string
          required_stars?: number
          stage?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          family_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          family_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          family_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_sync_events: {
        Row: {
          created_at: string
          entity: string
          entity_id: string
          family_id: string
          id: string
          op: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          entity: string
          entity_id: string
          family_id: string
          id?: string
          op: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          entity?: string
          entity_id?: string
          family_id?: string
          id?: string
          op?: string
          payload?: Json | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_stars: number
          family_id: string
          id: string
          reward: string | null
          target_categories: string[] | null
          target_stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_stars?: number
          family_id: string
          id?: string
          reward?: string | null
          target_categories?: string[] | null
          target_stars: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_stars?: number
          family_id?: string
          id?: string
          reward?: string | null
          target_categories?: string[] | null
          target_stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_family_id: string | null
          age: number
          created_at: string
          date_of_birth: string
          display_name: string
          gender: string
          id: string
          profile_complete: boolean
          updated_at: string
        }
        Insert: {
          active_family_id?: string | null
          age: number
          created_at?: string
          date_of_birth: string
          display_name: string
          gender: string
          id: string
          profile_complete?: boolean
          updated_at?: string
        }
        Update: {
          active_family_id?: string | null
          age?: number
          created_at?: string
          date_of_birth?: string
          display_name?: string
          gender?: string
          id?: string
          profile_complete?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_family_fk"
            columns: ["active_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_default: boolean
          is_house_chores: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_default?: boolean
          is_house_chores?: boolean
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_default?: boolean
          is_house_chores?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          family_id: string
          id: string
          payload: Json
          recipient_id: string
          task_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          family_id: string
          id?: string
          payload?: Json
          recipient_id: string
          task_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          family_id?: string
          id?: string
          payload?: Json
          recipient_id?: string
          task_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          category_id: string
          created_at: string
          created_by: string
          description: string | null
          family_id: string
          id: string
          is_default: boolean
          is_deletable: boolean
          name: string
          star_value: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by: string
          description?: string | null
          family_id: string
          id?: string
          is_default?: boolean
          is_deletable?: boolean
          name: string
          star_value?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          family_id?: string
          id?: string
          is_default?: boolean
          is_deletable?: boolean
          name?: string
          star_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          category_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          family_id: string
          id: string
          name: string
          star_value: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          category_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          family_id: string
          id?: string
          name: string
          star_value?: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          category_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          family_id?: string
          id?: string
          name?: string
          star_value?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          family_id: string
          id: string
          seen: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          family_id: string
          id?: string
          seen?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          family_id?: string
          id?: string
          seen?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      user_families: {
        Row: {
          current_stage: number
          family_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          last_read_timestamp: number
          seen_celebrations: string[]
          total_stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_stage?: number
          family_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_timestamp?: number
          seen_celebrations?: string[]
          total_stars?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_stage?: number
          family_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_timestamp?: number
          seen_celebrations?: string[]
          total_stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_families_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      get_family_members: {
        Args: { p_family_id: string }
        Returns: {
          active_family_id: string
          age: number
          current_stage: number
          date_of_birth: string
          display_name: string
          family_id: string
          gender: string
          joined_at: string
          profile_complete: boolean
          profile_id: string
          total_stars: number
          user_id: string
        }[]
      }
      get_my_family_ids: { Args: never; Returns: string[] }
      get_user_family_ids: { Args: { p_user_id: string }; Returns: string[] }
      is_family_comember: { Args: { p_user_id: string }; Returns: boolean }
      is_in_same_family: { Args: { target_user: string }; Returns: boolean }
      join_family_by_code: {
        Args: { p_invite_code: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }[]
      }
      seed_family_defaults: {
        Args: { p_creator: string; p_family_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
