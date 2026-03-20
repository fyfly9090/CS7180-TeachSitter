// Shared TypeScript types for TeachSitter.
// These mirror the database schema and are used across API routes, lib, and components.
// The Database interface here is a hand-written placeholder — replace with the output of:
//   supabase gen types typescript --local > types/supabase.gen.ts

// =====================
// Enums (string literal unions — no TS enum keyword)
// =====================

export type UserRole = 'parent' | 'teacher'
export type BookingStatus = 'pending' | 'confirmed' | 'declined'

// =====================
// Database Row Shapes
// =====================

export interface Profile {
  id: string // uuid — matches auth.users.id
  email: string
  role: UserRole
  created_at: string // ISO timestamp string from Supabase
}

export interface Teacher {
  id: string
  user_id: string // FK → profiles.id
  classroom: string
  bio: string
  created_at: string
}

export interface Availability {
  id: string
  teacher_id: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  is_booked: boolean
  created_at: string
}

export interface Child {
  id: string
  parent_id: string
  classroom: string
  age: number
  created_at: string
}

export interface Booking {
  id: string
  parent_id: string
  teacher_id: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  status: BookingStatus
  message: string | null
  created_at: string
}

export interface RankedTeacher {
  id: string
  name: string
  rank: number
  reasoning: string
}

export interface MatchEval {
  id: string
  parent_id: string
  ranked_teachers: RankedTeacher[]
  judge_score: number | null // null until async LLM-as-judge completes
  created_at: string
}

// =====================
// API Response Shapes
// =====================

// Teacher as returned to parents in search results (Teacher joined with Availability + name from profile)
export interface TeacherWithAvailability extends Teacher {
  name: string
  availability: Pick<Availability, 'start_date' | 'end_date'>[]
}

// Booking fields safe to return to either party
export type BookingResponse = Pick<
  Booking,
  'id' | 'parent_id' | 'teacher_id' | 'start_date' | 'end_date' | 'status'
>

// Standard API error shape — matches docs/API.md error format
export interface ApiError {
  error: {
    code: string
    message: string
  }
}

// =====================
// Supabase Database Interface
// Used as the generic parameter: createClient<Database>(url, key)
// Replace body with generated types once Supabase project is linked.
// =====================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      teachers: {
        Row: Teacher
        Insert: Omit<Teacher, 'id' | 'created_at'>
        Update: Partial<Omit<Teacher, 'id' | 'user_id' | 'created_at'>>
      }
      availability: {
        Row: Availability
        Insert: Omit<Availability, 'id' | 'created_at'>
        Update: Partial<Pick<Availability, 'start_date' | 'end_date' | 'is_booked'>>
      }
      children: {
        Row: Child
        Insert: Omit<Child, 'id' | 'created_at'>
        Update: Partial<Pick<Child, 'classroom' | 'age'>>
      }
      bookings: {
        Row: Booking
        Insert: Omit<Booking, 'id' | 'created_at'>
        Update: Partial<Pick<Booking, 'status'>>
      }
      match_evals: {
        Row: MatchEval
        Insert: Omit<MatchEval, 'id' | 'created_at'>
        Update: Partial<Pick<MatchEval, 'judge_score'>>
      }
    }
  }
}
