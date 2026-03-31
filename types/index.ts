// Shared TypeScript types for TeachSitter.
// These mirror the database schema and are used across API routes, lib, and components.
// The Database interface here is a hand-written placeholder — replace with the output of:
//   supabase gen types typescript --local > types/supabase.gen.ts

// =====================
// Enums (string literal unions — no TS enum keyword)
// =====================

export type UserRole = "parent" | "teacher";
export type BookingStatus = "pending" | "confirmed" | "declined";

// =====================
// Database Row Shapes
// =====================

export interface Profile {
  id: string; // uuid — matches auth.users.id
  email: string;
  role: UserRole;
  created_at: string; // ISO timestamp string from Supabase
}

export interface Teacher {
  id: string;
  user_id: string; // FK → profiles.id
  classroom: string;
  bio: string;
  expertise: string[]; // e.g. ["Art & Crafts", "STEM Activities"] — added in migration 006
  hourly_rate: number | null; // e.g. 45.00 — null if not set
  full_name: string | null; // e.g. "Ms. Tara Smith" — null if migration 005 not applied
  position: string | null; // e.g. "Preschool Teacher" — null if migration 005 not applied
  created_at: string;
}

export interface Availability {
  id: string;
  teacher_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS — null if not set
  end_time: string | null; // HH:MM:SS — null if not set
  is_booked: boolean;
  created_at: string;
}

export interface Child {
  id: string;
  parent_id: string;
  classroom: string;
  age: number;
  created_at: string;
}

export interface Booking {
  id: string;
  parent_id: string;
  teacher_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: BookingStatus;
  message: string | null;
  created_at: string;
}

export interface RankedTeacher {
  id: string;
  name: string;
  rank: number;
  reasoning: string;
}

export interface MatchEval {
  id: string;
  parent_id: string;
  ranked_teachers: RankedTeacher[];
  judge_score: number | null; // null until async LLM-as-judge completes
  created_at: string;
}

// =====================
// API Response Shapes
// =====================

// Teacher as returned to parents in search results (Teacher joined with Availability + name from profile)
export interface TeacherWithAvailability extends Teacher {
  name: string;
  availability: Pick<Availability, "start_date" | "end_date" | "start_time" | "end_time">[];
}

// Booking fields safe to return to either party
export type BookingResponse = Pick<
  Booking,
  "id" | "parent_id" | "teacher_id" | "start_date" | "end_date" | "status"
>;

// Standard API error shape — matches docs/API.md error format
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// =====================
// Supabase Database Interface
// Used as the generic parameter: createClient<Database>(url, key)
// Replace body with generated types once Supabase project is linked.
// =====================

// Supabase SDK v2.99+ requires Row/Insert/Update to satisfy Record<string, unknown>.
// Intersection with { [key: string]: unknown } satisfies this constraint while
// preserving specific field types. Replace with `supabase gen types typescript`
// output once the project is linked.
type DbRow<T> = T & { [key: string]: unknown };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: DbRow<Profile>;
        Insert: DbRow<Omit<Profile, "created_at">>;
        Update: DbRow<Partial<Omit<Profile, "id">>>;
        Relationships: [];
      };
      teachers: {
        Row: DbRow<Teacher>;
        Insert: DbRow<Omit<Teacher, "id" | "created_at">>;
        Update: DbRow<
          Partial<
            Pick<
              Teacher,
              "classroom" | "bio" | "expertise" | "hourly_rate" | "full_name" | "position"
            >
          >
        >;
        Relationships: [];
      };
      availability: {
        Row: DbRow<Availability>;
        Insert: DbRow<Omit<Availability, "id" | "created_at">>;
        Update: DbRow<Partial<Pick<Availability, "start_date" | "end_date" | "is_booked">>>;
        Relationships: [];
      };
      children: {
        Row: DbRow<Child>;
        Insert: DbRow<Omit<Child, "id" | "created_at">>;
        Update: DbRow<Partial<Pick<Child, "classroom" | "age">>>;
        Relationships: [];
      };
      bookings: {
        Row: DbRow<Booking>;
        Insert: DbRow<Omit<Booking, "id" | "created_at">>;
        Update: DbRow<Partial<Pick<Booking, "status">>>;
        Relationships: [];
      };
      match_evals: {
        Row: DbRow<MatchEval>;
        Insert: DbRow<Omit<MatchEval, "id" | "created_at">>;
        Update: DbRow<Partial<Pick<MatchEval, "judge_score">>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    PostgrestVersion: "12";
  };
}
