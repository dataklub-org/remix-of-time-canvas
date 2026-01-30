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
      babies: {
        Row: {
          created_at: string
          created_by: string
          date_of_birth: string
          id: string
          name: string
          place_of_birth: string | null
          time_of_birth: string | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date_of_birth: string
          id?: string
          name: string
          place_of_birth?: string | null
          time_of_birth?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date_of_birth?: string
          id?: string
          name?: string
          place_of_birth?: string | null
          time_of_birth?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      baby_access: {
        Row: {
          baby_id: string
          created_at: string
          id: string
          invited_by: string
          permission: Database["public"]["Enums"]["angel_permission"] | null
          role: Database["public"]["Enums"]["baby_access_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          baby_id: string
          created_at?: string
          id?: string
          invited_by: string
          permission?: Database["public"]["Enums"]["angel_permission"] | null
          role?: Database["public"]["Enums"]["baby_access_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          baby_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          permission?: Database["public"]["Enums"]["angel_permission"] | null
          role?: Database["public"]["Enums"]["baby_access_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baby_access_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
        ]
      }
      baby_moments: {
        Row: {
          baby_id: string
          category: Database["public"]["Enums"]["category_type"]
          description: string
          end_time: number | null
          height: number | null
          id: string
          location: string | null
          memorable: boolean | null
          original_moment_id: string | null
          people: string | null
          photo_url: string | null
          shared_at: string
          shared_by: string
          start_time: number
          width: number | null
          y_position: number
        }
        Insert: {
          baby_id: string
          category?: Database["public"]["Enums"]["category_type"]
          description: string
          end_time?: number | null
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          original_moment_id?: string | null
          people?: string | null
          photo_url?: string | null
          shared_at?: string
          shared_by: string
          start_time: number
          width?: number | null
          y_position?: number
        }
        Update: {
          baby_id?: string
          category?: Database["public"]["Enums"]["category_type"]
          description?: string
          end_time?: number | null
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          original_moment_id?: string | null
          people?: string | null
          photo_url?: string | null
          shared_at?: string
          shared_by?: string
          start_time?: number
          width?: number | null
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "baby_moments_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baby_moments_original_moment_id_fkey"
            columns: ["original_moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          connected_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          connected_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          connected_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          color: string | null
          group_id: string
          id: string
          joined_at: string
          status: string
          user_id: string
        }
        Insert: {
          color?: string | null
          group_id: string
          id?: string
          joined_at?: string
          status?: string
          user_id: string
        }
        Update: {
          color?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_moments: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          description: string
          end_time: number | null
          group_id: string
          height: number | null
          id: string
          location: string | null
          memorable: boolean | null
          original_moment_id: string | null
          people: string | null
          photo_url: string | null
          shared_at: string
          shared_by: string
          start_time: number
          width: number | null
          y_position: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["category_type"]
          description: string
          end_time?: number | null
          group_id: string
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          original_moment_id?: string | null
          people?: string | null
          photo_url?: string | null
          shared_at?: string
          shared_by: string
          start_time: number
          width?: number | null
          y_position?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          description?: string
          end_time?: number | null
          group_id?: string
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          original_moment_id?: string | null
          people?: string | null
          photo_url?: string | null
          shared_at?: string
          shared_by?: string
          start_time?: number
          width?: number | null
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_moments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_moments_original_moment_id_fkey"
            columns: ["original_moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          inviter_user_id: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          inviter_user_id: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          inviter_user_id?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      moments: {
        Row: {
          category: Database["public"]["Enums"]["category_type"]
          created_at: string
          description: string
          end_time: number | null
          height: number | null
          id: string
          location: string | null
          memorable: boolean | null
          people: string | null
          photo_url: string | null
          start_time: number
          timeline_id: string
          updated_at: string
          user_id: string
          width: number | null
          y_position: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["category_type"]
          created_at?: string
          description: string
          end_time?: number | null
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          people?: string | null
          photo_url?: string | null
          start_time: number
          timeline_id: string
          updated_at?: string
          user_id: string
          width?: number | null
          y_position?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["category_type"]
          created_at?: string
          description?: string
          end_time?: number | null
          height?: number | null
          id?: string
          location?: string | null
          memorable?: boolean | null
          people?: string | null
          photo_url?: string | null
          start_time?: number
          timeline_id?: string
          updated_at?: string
          user_id?: string
          width?: number | null
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "moments_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      public_usernames: {
        Row: {
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      timelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_contribute_to_baby: {
        Args: { _baby_id: string; _user_id: string }
        Returns: boolean
      }
      delete_user_account: { Args: never; Returns: undefined }
      has_baby_access: {
        Args: { _baby_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_username_exact: {
        Args: { search_username: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      redeem_invite_code: { Args: { invite_code: string }; Returns: boolean }
      validate_invite_code: {
        Args: { code_to_validate: string }
        Returns: {
          inviter_username: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      angel_permission: "view" | "contribute"
      baby_access_role: "parent" | "angel"
      category_type: "business" | "personal"
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
      angel_permission: ["view", "contribute"],
      baby_access_role: ["parent", "angel"],
      category_type: ["business", "personal"],
    },
  },
} as const
