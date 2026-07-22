import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, EmptyState } from "../components/ui";
import { colors, radius, spacing } from "../theme";
import { fetchAnnouncements, type Message } from "../api";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setMessages(await fetchAnnouncements(50));
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Team Chat</Text>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loaded ? <EmptyState text="No messages yet." /> : null}
        renderItem={({ item }) => (
          <Card style={[styles.msg, item.priority === "urgent" && styles.urgent]}>
            {item.priority === "urgent" && <Text style={styles.urgentTag}>URGENT</Text>}
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
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
  msg: {},
  urgent: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  urgentTag: { color: colors.danger, fontSize: 10, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
  body: { color: colors.slate700, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.slate400, fontSize: 12, marginTop: 6 },
});
