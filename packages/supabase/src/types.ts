/**
 * Database type placeholder.
 *
 * In production, generate this with:
 *   npx supabase gen types typescript --project-id <id> > packages/supabase/src/types.ts
 *
 * For now we use a permissive index signature so the typed client compiles and
 * `.from("any_table")` works against the schema defined in /supabase/schema.sql.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface GenericTable {
  Row: Record<string, Json | undefined>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: { [name: string]: GenericTable };
    Views: { [name: string]: { Row: Record<string, Json | undefined> } };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
