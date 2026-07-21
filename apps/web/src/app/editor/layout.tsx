import { AuthGuard } from "@/features/auth";

// Full-screen immersive editor — no app sidebar, no rounded panel chrome.
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="dark h-screen w-screen overflow-hidden bg-background text-foreground">
        {children}
      </div>
    </AuthGuard>
  );
}
