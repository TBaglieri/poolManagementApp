import { PageSkeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for every authenticated page. Next renders this inside
 * the app shell (sidebar/topbar stay put) during navigation and RSC data fetches,
 * so no page transition ever sits blank.
 */
export default function AppLoading() {
  return <PageSkeleton />;
}
