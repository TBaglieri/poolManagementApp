/**
 * Push notification setup for iOS (APNs) + Android (FCM) via Expo.
 *
 * Client side is here: permission request, Expo push token, an Android channel,
 * and a foreground handler. The SERVER side (sending a push when a shift is
 * published / a reading is out of range / an approval happens) sends to the Expo
 * push API using the token you persist below — see NATIVE.md.
 *
 * Requires a real device + EAS credentials (APNs key / FCM) to actually deliver.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Ask permission and return the Expo push token (or null if unavailable). */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // Push only works on physical devices.

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0891B2",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return null;

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Persist the push token against the signed-in user so the server can target
 * them. Best-effort; requires a `push_tokens` table (see NATIVE.md) + RLS.
 */
export async function savePushToken(
  client: { from: (t: string) => any } | null,
  userId: string,
  token: string,
): Promise<void> {
  if (!client) return;
  try {
    await client.from("push_tokens").upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  } catch {
    /* table may not exist yet — non-fatal */
  }
}

/** Register a tap handler that deep-links to a record (href in notification data). */
export function addNotificationResponseListener(onDeepLink: (href: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const href = response.notification.request.content.data?.href;
    if (typeof href === "string") onDeepLink(href);
  });
}
