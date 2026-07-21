import { AuthForm } from "../components/auth-form";

export function LoginPage() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <AuthForm />
    </div>
  );
}
