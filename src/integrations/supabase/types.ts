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
      accompaniment_sessions: {
        Row: {
          area: string
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accompaniment_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advogados: {
        Row: {
          ativo: boolean
          created_at: string
          especialidade: string | null
          id: string
          nome: string
          oab: string
          whatsapp: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          especialidade?: string | null
          id?: string
          nome: string
          oab: string
          whatsapp: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          especialidade?: string | null
          id?: string
          nome?: string
          oab?: string
          whatsapp?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      onboarding_responses: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question: string
          step: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question: string
          step: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string
          step?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_data: {
        Row: {
          areas: Json | null
          attention_points: Json | null
          extra_data: Json | null
          generated_at: string
          id: string
          insights: Json | null
          next_steps: Json | null
          radar_scores: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          areas?: Json | null
          attention_points?: Json | null
          extra_data?: Json | null
          generated_at?: string
          id?: string
          insights?: Json | null
          next_steps?: Json | null
          radar_scores?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          areas?: Json | null
          attention_points?: Json | null
          extra_data?: Json | null
          generated_at?: string
          id?: string
          insights?: Json | null
          next_steps?: Json | null
          radar_scores?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_history: {
        Row: {
          archived_at: string
          areas: Json | null
          attention_points: Json | null
          extra_data: Json | null
          generated_at: string
          id: string
          insights: Json | null
          next_steps: Json | null
          radar_scores: Json | null
          user_id: string
        }
        Insert: {
          archived_at?: string
          areas?: Json | null
          attention_points?: Json | null
          extra_data?: Json | null
          generated_at?: string
          id?: string
          insights?: Json | null
          next_steps?: Json | null
          radar_scores?: Json | null
          user_id: string
        }
        Update: {
          archived_at?: string
          areas?: Json | null
          attention_points?: Json | null
          extra_data?: Json | null
          generated_at?: string
          id?: string
          insights?: Json | null
          next_steps?: Json | null
          radar_scores?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          advogado_id: string | null
          bio: string | null
          consultas_limit: number
          consultas_today: number
          consultas_used: number
          created_at: string
          email: string | null
          escritorio_nome: string | null
          especialidade: string | null
          full_name: string | null
          id: string
          last_consulta_date: string | null
          oab_number: string | null
          perfil_generations_limit: number
          perfil_generations_used: number
          plan_type: string
          plano_expira_em: string
          plataforma_start_date: string
          queries_limit: number
          queries_used: number
          role: string
          status: string
          whatsapp: string | null
        }
        Insert: {
          advogado_id?: string | null
          bio?: string | null
          consultas_limit?: number
          consultas_today?: number
          consultas_used?: number
          created_at?: string
          email?: string | null
          escritorio_nome?: string | null
          especialidade?: string | null
          full_name?: string | null
          id: string
          last_consulta_date?: string | null
          oab_number?: string | null
          perfil_generations_limit?: number
          perfil_generations_used?: number
          plan_type?: string
          plano_expira_em?: string
          plataforma_start_date?: string
          queries_limit?: number
          queries_used?: number
          role?: string
          status?: string
          whatsapp?: string | null
        }
        Update: {
          advogado_id?: string | null
          bio?: string | null
          consultas_limit?: number
          consultas_today?: number
          consultas_used?: number
          created_at?: string
          email?: string | null
          escritorio_nome?: string | null
          especialidade?: string | null
          full_name?: string | null
          id?: string
          last_consulta_date?: string | null
          oab_number?: string | null
          perfil_generations_limit?: number
          perfil_generations_used?: number
          plan_type?: string
          plano_expira_em?: string
          plataforma_start_date?: string
          queries_limit?: number
          queries_used?: number
          role?: string
          status?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_advogado_id_fkey"
            columns: ["advogado_id"]
            isOneToOne: false
            referencedRelation: "advogados"
            referencedColumns: ["id"]
          },
        ]
      }
      queries: {
        Row: {
          answer: string | null
          area: string | null
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          area?: string | null
          created_at?: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          area?: string | null
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_notas: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          nota: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          nota: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          nota?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_notas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: { Args: never; Returns: Json }
      get_all_clientes: {
        Args: never
        Returns: {
          advogado_id: string
          advogado_nome: string
          created_at: string
          email: string
          full_name: string
          id: string
          nivel_vulnerabilidade: string
          perfil_generations_limit: number
          perfil_generations_used: number
          queries_limit: number
          queries_used: number
          status: string
          tem_perfil: boolean
        }[]
      }
      get_my_advogado_contact: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      list_advogadas_publicas: {
        Args: never
        Returns: {
          especialidade: string
          id: string
          nome: string
          oab: string
        }[]
      }
      pode_fazer_consulta: { Args: { p_user_id: string }; Returns: Json }
      registrar_consulta: { Args: { p_user_id: string }; Returns: undefined }
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
