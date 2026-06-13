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
      dev_notes: {
        Row: {
          context: string | null
          created_at: string | null
          done_at: string | null
          id: string
          note: string
          status: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          done_at?: string | null
          id?: string
          note: string
          status?: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          done_at?: string | null
          id?: string
          note?: string
          status?: string
        }
        Relationships: []
      }
      grocery_categories: {
        Row: {
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      grocery_list_items: {
        Row: {
          grocery_type_id: string | null
          id: string
          is_archived: boolean | null
          is_in_stock: boolean | null
          is_purchased: boolean | null
          list_id: string | null
          quantity: number | null
          unit: string | null
        }
        Insert: {
          grocery_type_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_in_stock?: boolean | null
          is_purchased?: boolean | null
          list_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          grocery_type_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_in_stock?: boolean | null
          is_purchased?: boolean | null
          list_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_items_grocery_type_id_fkey"
            columns: ["grocery_type_id"]
            isOneToOne: false
            referencedRelation: "grocery_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_lists: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
        }
        Relationships: []
      }
      grocery_types: {
        Row: {
          category_id: string | null
          default_store_id: string | null
          embedding: string | null
          id: string
          name: string
        }
        Insert: {
          category_id?: string | null
          default_store_id?: string | null
          embedding?: string | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string | null
          default_store_id?: string | null
          embedding?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "grocery_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_types_default_store_id_fkey"
            columns: ["default_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          date: string
          diner_type: string
          id: string
          entry_type: string | null
          recipe_id: string | null
          list_id: string | null
          item_grocery_type_id: string | null
          quantity: number | null
          unit: string | null
          note_text: string | null
          servings: number | null
          slot: string
          // Legacy (pre-redesign) columns — dropped by 20260613_cleanup.sql
          plan_type?: string | null
          reference_id?: string | null
        }
        Insert: {
          date: string
          diner_type: string
          id?: string
          entry_type?: string | null
          recipe_id?: string | null
          list_id?: string | null
          item_grocery_type_id?: string | null
          quantity?: number | null
          unit?: string | null
          note_text?: string | null
          servings?: number | null
          slot: string
          plan_type?: string | null
          reference_id?: string | null
        }
        Update: {
          date?: string
          diner_type?: string
          id?: string
          entry_type?: string | null
          recipe_id?: string | null
          list_id?: string | null
          item_grocery_type_id?: string | null
          quantity?: number | null
          unit?: string | null
          note_text?: string | null
          servings?: number | null
          slot?: string
          plan_type?: string | null
          reference_id?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string | null
          grocery_type_id: string | null
          quantity: number | null
          unit: string | null
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          grocery_type_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Update: {
          id?: string
          recipe_id?: string | null
          grocery_type_id?: string | null
          quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_grocery_type_id_fkey"
            columns: ["grocery_type_id"]
            isOneToOne: false
            referencedRelation: "grocery_types"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time_minutes: number | null
          embedding: string | null
          id: string
          ingredients_list_id: string | null
          instructions: string | null
          is_archived: boolean | null
          name: string
          category: string | null
          prep_time_minutes: number | null
          servings: number | null
          total_time_mins: number | null
          web_source: string | null
        }
        Insert: {
          cook_time_minutes?: number | null
          embedding?: string | null
          id?: string
          ingredients_list_id?: string | null
          instructions?: string | null
          is_archived?: boolean | null
          name: string
          category?: string | null
          prep_time_minutes?: number | null
          servings?: number | null
          total_time_mins?: number | null
          web_source?: string | null
        }
        Update: {
          cook_time_minutes?: number | null
          embedding?: string | null
          id?: string
          ingredients_list_id?: string | null
          instructions?: string | null
          is_archived?: boolean | null
          name?: string
          category?: string | null
          prep_time_minutes?: number | null
          servings?: number | null
          total_time_mins?: number | null
          web_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_ingredients_list_id_fkey"
            columns: ["ingredients_list_id"]
            isOneToOne: false
            referencedRelation: "grocery_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          created_at: string | null
          grocery_type_id: string | null
          id: string
          is_archived: boolean | null
          is_in_stock: boolean | null
          is_purchased: boolean | null
          meal_plan_entry_id: string | null
          quantity: number
          recipe_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string | null
          grocery_type_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_in_stock?: boolean | null
          is_purchased?: boolean | null
          meal_plan_entry_id?: string | null
          quantity: number
          recipe_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string | null
          grocery_type_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_in_stock?: boolean | null
          is_purchased?: boolean | null
          meal_plan_entry_id?: string | null
          quantity?: number
          recipe_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_grocery_type_id_fkey"
            columns: ["grocery_type_id"]
            isOneToOne: false
            referencedRelation: "grocery_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_meal_plan_entry_id_fkey"
            columns: ["meal_plan_entry_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_grocery_types: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
      match_recipes: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
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
