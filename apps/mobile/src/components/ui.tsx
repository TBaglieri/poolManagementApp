import React from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewProps,
} from "react-native";
import { colors, radius, spacing } from "../theme";

export function Card({ style, children, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Button({
  label, onPress, variant = "primary", loading, disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? colors.brand : variant === "danger" ? colors.danger : colors.white;
  const fg = variant === "secondary" ? colors.slate700 : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderWidth: variant === "secondary" ? 1 : 0, borderColor: colors.slate200, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.slate400} style={styles.input} {...props} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.slate200,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.slate700, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.4 },
  button: { borderRadius: radius.md, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 15, fontWeight: "700" },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.slate200,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.slate900,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginBottom: 6 },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { color: colors.slate400, fontSize: 14 },
});
