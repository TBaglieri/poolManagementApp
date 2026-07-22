/**
 * Thin data layer for the native app. Talks to Supabase directly with the public
 * anon client (RLS enforces access). Each call returns [] / null on any error so
 * screens never crash — mirroring the web repo layer's graceful degradation.
 *
 * NOTE: the web app's `repos` are Next.js "use client" modules, so the native app
 * uses its own minimal queries here against the same tables.
 */
import { getSupabase } from "./lib/supabase";

export interface Shift {
  id: string;
  facility_id: string;
  position: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  assigned_staff_id: string | null;
  status: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  priority: string | null;
}

export interface ClockEntry {
  id: string;
  staff_id: string;
  facility_id: string | null;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
}

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  const client = getSupabase();
  if (!client) return fallback;
  try {
    return await run();
  } catch {
    return fallback;
  }
}

/** The staff_profiles row id for the signed-in user (their "own" record). */
export async function getMyStaffId(): Promise<string | null> {
  return safe(async () => {
    const client = getSupabase()!;
    const { data: userRes } = await client.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return null;
    const { data } = await client.from("staff_profiles").select("id").eq("profile_id", uid).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }, null);
}

export async function fetchMyShifts(staffId: string): Promise<Shift[]> {
  return safe(async () => {
    const client = getSupabase()!;
    const { data } = await client.from("shifts").select("*").eq("assigned_staff_id", staffId).order("shift_date");
    return (data as Shift[]) ?? [];
  }, []);
}

export async function fetchAnnouncements(limit = 20): Promise<Message[]> {
  return safe(async () => {
    const client = getSupabase()!;
    const { data } = await client.from("messages").select("*").order("created_at", { ascending: false }).limit(limit);
    return (data as Message[]) ?? [];
  }, []);
}

export async function fetchActiveClock(staffId: string): Promise<ClockEntry | null> {
  return safe(async () => {
    const client = getSupabase()!;
    const { data } = await client
      .from("time_clock_entries").select("*")
      .eq("staff_id", staffId).is("clock_out", null)
      .order("clock_in", { ascending: false }).limit(1).maybeSingle();
    return (data as ClockEntry | null) ?? null;
  }, null);
}

export async function clockIn(staffId: string, facilityId: string | null): Promise<boolean> {
  return safe(async () => {
    const client = getSupabase()!;
    const { error } = await client.from("time_clock_entries").insert({
      staff_id: staffId, facility_id: facilityId, clock_in: new Date().toISOString(), status: "clocked_in",
    });
    return !error;
  }, false);
}

export async function clockOut(entryId: string): Promise<boolean> {
  return safe(async () => {
    const client = getSupabase()!;
    const { error } = await client.from("time_clock_entries")
      .update({ clock_out: new Date().toISOString(), status: "clocked_out" }).eq("id", entryId);
    return !error;
  }, false);
}

export async function reportIssue(input: { facilityId: string | null; title: string; description: string; priority: string; reportedBy: string }): Promise<boolean> {
  return safe(async () => {
    const client = getSupabase()!;
    const { error } = await client.from("maintenance_issues").insert({
      facility_id: input.facilityId, title: input.title, description: input.description,
      priority: input.priority, status: "new", reported_by: input.reportedBy,
    });
    return !error;
  }, false);
}
