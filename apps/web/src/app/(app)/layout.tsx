import { AuthGuard } from "@/features/auth";
import { SidebarRecent } from "@/features/projects";
import { AppSidebar } from "@/shared/components/app-sidebar/app-sidebar";

// App shell: dark chrome + persistent sidebar around every authed screen.
// The composition root wires feature content (Recent projects) into the shell.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dark flex h-screen bg-card text-foreground">
        <AppSidebar recentSlot={<SidebarRecent />} />
        <main className="m-2 flex-1 overflow-auto rounded-xl border border-border bg-background">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
