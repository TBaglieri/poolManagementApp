import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Label } from "../components/ui";
import { colors, radius, spacing } from "../theme";
import { getMyStaffId, reportIssue } from "../api";
import { getEffectiveDataMode } from "../lib/supabase";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export default function ReportIssueScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [busy, setBusy] = useState(false);
  const supabase = getEffectiveDataMode() === "supabase";

  const submit = async () => {
    if (!title.trim()) { Alert.alert("Add a title", "Describe the issue in a few words."); return; }
    if (!supabase) { Alert.alert("Demo mode", "Connect Supabase to file real maintenance issues."); return; }
    setBusy(true);
    const staffId = await getMyStaffId();
    const ok = await reportIssue({ facilityId: null, title: title.trim(), description: description.trim(), priority, reportedBy: staffId ?? "" });
    setBusy(false);
    if (!ok) { Alert.alert("Couldn't submit", "Check your connection and try again."); return; }
    Alert.alert("Reported", "Your maintenance issue was submitted.", [{ text: "OK", onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Label>Title</Label>
        <Input value={title} onChangeText={setTitle} placeholder="e.g. Cracked skimmer basket" />
        <View style={{ height: spacing.md }} />
        <Label>Description</Label>
        <Input value={description} onChangeText={setDescription} placeholder="What's wrong?" multiline numberOfLines={4} style={styles.multiline} />
        <View style={{ height: spacing.md }} />
        <Label>Priority</Label>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <Text
              key={p}
              onPress={() => setPriority(p)}
              style={[styles.priority, priority === p && styles.priorityActive]}
            >
              {p}
            </Text>
          ))}
        </View>
        <View style={{ height: spacing.xl }} />
        <Button label="Submit issue" onPress={submit} loading={busy} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg },
  multiline: { height: 110, textAlignVertical: "top" },
  priorityRow: { flexDirection: "row", gap: spacing.sm },
  priority: {
    flex: 1, textAlign: "center", paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.slate200, color: colors.slate500, backgroundColor: colors.white, textTransform: "capitalize", overflow: "hidden",
  },
  priorityActive: { backgroundColor: colors.brand, color: colors.white, borderColor: colors.brand },
});
