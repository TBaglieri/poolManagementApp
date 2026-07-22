import { icons, Circle, type LucideProps } from "lucide-react";

/** Resolve a lucide icon by its PascalCase name, with a safe fallback. */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (icons as Record<string, React.ComponentType<LucideProps>>)[name] ?? Circle;
  return <Cmp {...props} />;
}
