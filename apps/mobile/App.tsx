import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { addNotificationResponseListener, registerForPushNotifications } from "./src/lib/notifications";

/**
 * PoolOps Pro — native app root.
 *
 * Providers: SafeArea → Auth → Navigation. Deep links (poolops://...) and
 * notification taps route to the matching tab so a "shift published" push opens
 * the schedule, etc. Push registration is best-effort (needs a real device).
 */

const navRef = createNavigationContainerRef();
const prefix = Linking.createURL("/");

const linking = {
  prefixes: [prefix, "poolops://"],
  config: {
    screens: {
      Tabs: {
        screens: { Home: "home", Schedule: "schedule", Clock: "clock", Chat: "chat", Profile: "profile" },
      },
      ReportIssue: "report",
    },
  },
};

/** Map a web-style href from a notification payload to a tab route. */
function hrefToRoute(href: string): string {
  if (href.includes("schedule")) return "Schedule";
  if (href.includes("chat")) return "Chat";
  if (href.includes("clock") || href.includes("time")) return "Clock";
  return "Home";
}

export default function App() {
  useEffect(() => {
    registerForPushNotifications();
    const sub = addNotificationResponseListener((href) => {
      // Untyped param list on the ref — cast to navigate to the matching tab.
      if (navRef.isReady()) (navRef as unknown as { navigate: (n: string, p?: object) => void }).navigate("Tabs", { screen: hrefToRoute(href) });
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navRef} linking={linking}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
