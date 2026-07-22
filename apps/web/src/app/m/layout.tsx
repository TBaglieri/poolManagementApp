import { MobileShell } from "@/components/mobile/mobile-shell";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
