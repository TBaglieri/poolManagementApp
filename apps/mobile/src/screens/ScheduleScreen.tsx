import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, EmptyState } from "../components/ui";
import { colors, radius, spacing } from "../theme";
import { fetchMyShifts, getMyStaffId, type Shift } from "../api";

export default function ScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const staffId = await getMyStaffId();
    setShifts(staffId ? await fetchMyShifts(staffId) : []);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>My Schedule</Text>
      <FlatList
        data={shifts}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loaded ? <EmptyState text="No upcoming shifts." /> : null}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{new Date(item.shift_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}</Text>
              <Text style={styles.dateChipDay}>{new Date(item.shift_date + "T00:00:00").getDate()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.time}>{item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}</Text>
              <Text style={styles.sub}>{item.position}</Text>
            </View>
            <Text style={styles.status}>{item.status}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: colors.slate900, padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateChip: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandDark, alignItems: "center", justifyContent: "center" },
  dateChipText: { color: colors.brandLight, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  dateChipDay: { color: colors.white, fontSize: 16, fontWeight: "800" },
  time: { fontSize: 15, fontWeight: "700", color: colors.slate900 },
  sub: { fontSize: 13, color: colors.slate500, marginTop: 2, textTransform: "capitalize" },
  status: { fontSize: 12, fontWeight: "600", color: colors.brand, textTransform: "capitalize" },
});
