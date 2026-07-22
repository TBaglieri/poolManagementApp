import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { Button, Input, Label } from "../components/ui";
import { colors, radius, spacing } from "../theme";
import { getEffectiveDataMode } from "../lib/supabase";

export default function LoginScreen() {
  const { signIn, signUp, continueAsDemo } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = getEffectiveDataMode() === "supabase";

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    const res = mode === "in" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.brand}>PoolOps <Text style={{ color: colors.brandLight }}>Pro</Text></Text>
            <Text style={styles.tagline}>Operations for the deck and the office.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>{mode === "in" ? "Sign in" : "Create your account"}</Text>

            <Label>Email</Label>
            <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@pool.org" />
            <View style={{ height: spacing.md }} />
            <Label>Password</Label>
            <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={{ height: spacing.lg }} />
            <Button label={mode === "in" ? "Sign in" : "Sign up"} onPress={submit} loading={busy} />

            <Text style={styles.toggle} onPress={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}>
              {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
            </Text>

            {!supabase && (
              <>
                <View style={styles.divider} />
                <Button label="Continue in demo mode" variant="secondary" onPress={continueAsDemo} />
                <Text style={styles.demoNote}>No backend configured — explore with sample data.</Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, justifyContent: "center" },
  hero: { alignItems: "center", paddingVertical: spacing.xl },
  brand: { color: colors.white, fontSize: 32, fontWeight: "800" },
  tagline: { color: colors.slate400, fontSize: 14, marginTop: 6 },
  form: { backgroundColor: colors.bg, marginHorizontal: spacing.lg, borderRadius: radius.xl, padding: spacing.xl },
  heading: { fontSize: 20, fontWeight: "800", color: colors.slate900, marginBottom: spacing.lg },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  toggle: { color: colors.brand, fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: spacing.lg },
  divider: { height: 1, backgroundColor: colors.slate200, marginVertical: spacing.lg },
  demoNote: { color: colors.slate400, fontSize: 12, textAlign: "center", marginTop: spacing.sm },
});
