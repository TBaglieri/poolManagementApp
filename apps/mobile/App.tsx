import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getEffectiveDataMode, isSupabaseConfigured } from "./lib/supabase";

/**
 * PoolOps Pro mobile — starter home screen.
 *
 * This Expo scaffold shares the same Supabase backend and data-mode concept as
 * the web app. The full set of staff/manager screens (Home, Schedule, Chat,
 * Clock, Checklists, Report, Profile) mirrors the in-app web preview under
 * apps/web/src/app/m/*. Port those screens here to React Native primitives.
 */

const COLORS = {
  brand: "#0891B2",
  navy: "#0a1521",
  slate: "#475569",
  bg: "#f8fafc",
  card: "#ffffff",
};

const QUICK = [
  { label: "My Schedule", emoji: "📅" },
  { label: "Team Chat", emoji: "💬" },
  { label: "Clock In/Out", emoji: "⏱️" },
  { label: "Checklists", emoji: "✅" },
  { label: "Report Issue", emoji: "🔧" },
  { label: "Profile", emoji: "👤" },
];

export default function App() {
  const [mode] = useState(getEffectiveDataMode());

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>PoolOps <Text style={{ color: "#67E8F9" }}>Pro</Text></Text>
        <View style={styles.syncPill}>
          <View style={[styles.dot, { backgroundColor: mode === "supabase" ? "#34d399" : "#94a3b8" }]} />
          <Text style={styles.syncText}>{mode === "supabase" ? "Live sync" : "Demo mode"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroSmall}>Good morning,</Text>
          <Text style={styles.heroBig}>Welcome back 👋</Text>
          <View style={styles.heroCard}>
            <Text style={styles.heroCardLabel}>Today's shift</Text>
            <Text style={styles.heroCardTime}>8:00 AM – 1:00 PM</Text>
            <Text style={styles.heroCardSub}>Maplewood Community Pool · Lifeguard</Text>
            <TouchableOpacity style={styles.clockBtn}>
              <Text style={styles.clockBtnText}>⏱️  Clock In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.grid}>
          {QUICK.map((q) => (
            <TouchableOpacity key={q.label} style={styles.tile}>
              <Text style={styles.tileEmoji}>{q.emoji}</Text>
              <Text style={styles.tileLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Backend: {isSupabaseConfigured() ? "Supabase configured" : "Mock data (set EXPO_PUBLIC_* env to connect)"}.
            {"\n"}This scaffold shares the Supabase backend with the web dashboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 12 },
  brand: { color: "#fff", fontSize: 18, fontWeight: "700" },
  syncPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { color: "#e2e8f0", fontSize: 11, fontWeight: "600" },
  scroll: { paddingBottom: 32 },
  hero: { backgroundColor: COLORS.brand, padding: 20 },
  heroSmall: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  heroBig: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 },
  heroCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 16, marginTop: 16 },
  heroCardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  heroCardTime: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 4 },
  heroCardSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  clockBtn: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  clockBtnText: { color: COLORS.brand, fontWeight: "700" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  tile: { width: "30%", backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", paddingVertical: 16, margin: "1.5%" },
  tileEmoji: { fontSize: 22 },
  tileLabel: { fontSize: 11, fontWeight: "600", color: COLORS.slate, marginTop: 6, textAlign: "center" },
  note: { margin: 16, padding: 14, backgroundColor: "#ecfeff", borderRadius: 14, borderWidth: 1, borderColor: "#a5f3fc" },
  noteText: { fontSize: 12, color: "#155e75", lineHeight: 18 },
});
