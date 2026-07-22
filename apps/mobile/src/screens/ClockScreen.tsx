import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";
import { clockIn, clockOut, fetchActiveClock, getMyStaffId, type ClockEntry } from "../api";
import { getEffectiveDataMode } from "../lib/supabase";

export default function ClockScreen() {
  const [staffId, setStaffId] = useState<string | null>(null);
  const [active, setActive] = useState<ClockEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const supabase = getEffectiveDataMode() === "supabase";

  const load = useCallback(async () => {
    const id = await getMyStaffId();
    setStaffId(id);
    setActive(id ? await fetchActiveClock(id) : null);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    if (!supabase || !staffId) {
      Alert.alert("Demo mode", "Sign in with a real account (Supabase configured) to clock in for real.");
      return;
    }
    setBusy(true);
    const facilityId = active?.facility_id ?? null;
    const ok = active ? await clockOut(active.id) : await clockIn(staffId, facilityId);
    setBusy(false);
    if (!ok) { Alert.alert("Couldn't save", "Please check your connection and try again."); return; }
    await load();
  };

  const clockedIn = !!active;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.date}>{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
        <Text style={styles.time}>{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text>
      </View>

      <View style={styles.center}>
        <Pressable
          onPress={toggle}
          disabled={busy}
          style={({ pressed }) => [
            styles.bigButton,
            { backgroundColor: clockedIn ? colors.danger : colors.success, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.bigButtonText}>{busy ? "…" : clockedIn ? "Clock Out" : "Clock In"}</Text>
          {clockedIn && active?.clock_in && (
            <Text style={styles.since}>In since {new Date(active.clock_in).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</Text>
          )}
        </Pressable>
        {!supabase && <Text style={styles.note}>Demo mode — connect Supabase to record real punches.</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: "center", paddingVertical: spacing.xl },
  date: { color: colors.slate500, fontSize: 14 },
  time: { color: colors.slate900, fontSize: 40, fontWeight: "800", marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  bigButton: { width: 220, height: 220, borderRadius: 110, alignItems: "center", justifyContent: "center" },
  bigButtonText: { color: colors.white, fontSize: 26, fontWeight: "800" },
  since: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 8 },
  note: { color: colors.slate400, fontSize: 12 },
});
