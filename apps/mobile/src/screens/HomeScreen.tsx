import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, EmptyState, SectionTitle } from "../components/ui";
import { colors, radius, spacing } from "../theme";
import { fetchAnnouncements, fetchMyShifts, getMyStaffId, type Message, type Shift } from "../api";
import { getEffectiveDataMode } from "../lib/supabase";

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function HomeScreen() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [announcement, setAnnouncement] = useState<Message | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = getEffectiveDataMode() === "supabase";

  const load = useCallback(async () => {
    const staffId = await getMyStaffId();
    if (staffId) {
      const shifts = await fetchMyShifts(staffId);
      setShift(shifts.find((s) => s.shift_date === todayKey()) ?? shifts[0] ?? null);
    }
    const msgs = await fetchAnnouncements(1);
    setAnnouncement(msgs[0] ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.hi}>Welcome back 👋</Text>
          <View style={[styles.pill, { backgroundColor: supabase ? colors.successBg : colors.slate100 }]}>
            <Text style={[styles.pillText, { color: supabase ? colors.success : colors.slate500 }]}>{supabase ? "Live sync" : "Demo mode"}</Text>
          </View>
        </View>

        <SectionTitle>Today's shift</SectionTitle>
        <Card style={styles.shiftCard}>
          {shift ? (
            <>
              <Text style={styles.shiftTime}>{shift.start_time?.slice(0, 5)} – {shift.end_time?.slice(0, 5)}</Text>
              <Text style={styles.shiftSub}>{shift.position} · {shift.shift_date}</Text>
              <View style={[styles.badge, { backgroundColor: colors.brand }]}><Text style={styles.badgeText}>{shift.status}</Text></View>
            </>
          ) : (
            <Text style={styles.noShift}>{supabase ? "No shift scheduled today." : "Sign in with a real account to see your shifts."}</Text>
          )}
        </Card>

        <View style={{ height: spacing.lg }} />
        <SectionTitle>Latest announcement</SectionTitle>
        {announcement ? (
          <Card>
            <Text style={styles.msgBody}>{announcement.body}</Text>
            <Text style={styles.msgMeta}>{new Date(announcement.created_at).toLocaleString()}</Text>
          </Card>
        ) : <EmptyState text="No announcements yet." />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  hi: { fontSize: 22, fontWeight: "800", color: colors.slate900 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: "700" },
  shiftCard: { backgroundColor: colors.brandDark },
  shiftTime: { color: colors.white, fontSize: 24, fontWeight: "800" },
  shiftSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  badge: { alignSelf: "flex-start", marginTop: spacing.md, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  noShift: { color: "rgba(255,255,255,0.9)", fontSize: 14 },
  msgBody: { color: colors.slate700, fontSize: 14, lineHeight: 20 },
  msgMeta: { color: colors.slate400, fontSize: 12, marginTop: spacing.sm },
});
