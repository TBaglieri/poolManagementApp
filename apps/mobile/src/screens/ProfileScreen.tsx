import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card } from "../components/ui";
import { colors, spacing } from "../theme";
import { useAuth } from "../auth/AuthContext";
import { getEffectiveDataMode } from "../lib/supabase";

export default function ProfileScreen({ navigation }: { navigation: { navigate: (r: string) => void } }) {
  const { session, demo, signOut } = useAuth();
  const email = session?.user?.email ?? (demo ? "Demo user" : "—");
  const supabase = getEffectiveDataMode() === "supabase";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <Card style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{email.slice(0, 1).toUpperCase()}</Text></View>
          <View>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.mode}>{supabase ? "Live sync" : "Demo mode"}</Text>
          </View>
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button label="Report a maintenance issue" variant="secondary" onPress={() => navigation.navigate("ReportIssue")} />
        <View style={{ height: spacing.sm }} />
        <Button label="Sign out" variant="danger" onPress={signOut} />

        <Text style={styles.version}>PoolOps Pro · v0.1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, flex: 1 },
  title: { fontSize: 22, fontWeight: "800", color: colors.slate900, marginBottom: spacing.lg },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: "800" },
  email: { fontSize: 15, fontWeight: "700", color: colors.slate900 },
  mode: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  version: { textAlign: "center", color: colors.slate400, fontSize: 12, marginTop: "auto" },
});
