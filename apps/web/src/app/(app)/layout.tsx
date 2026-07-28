import { AuthGuard } from "@/features/auth";
import { SidebarRecent } from "@/features/projects";
import { AppShell } from "@/shared/components/app-shell";

// App shell: persistent sidebar around every authed screen (dashboard + editors).
// Navigation only swaps the content inside `main`; the sidebar stays fixed.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dark h-screen w-screen overflow-hidden bg-card text-foreground">
        <AppShell recentSlot={<SidebarRecent />}>{children}</AppShell>
      </div>
    </AuthGuard>
  );
}
