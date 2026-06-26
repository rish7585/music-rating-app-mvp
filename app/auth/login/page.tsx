import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-zinc-600">Build a private map of your music life.</p>
        <LoginForm />
        <p className="text-sm text-zinc-600">
          New here? <Link className="text-violet-700" href="/auth/signup">Create account</Link>
        </p>
        <p className="text-xs text-zinc-500">Demo: demo@musicdiary.app / password123</p>
      </Card>
    </div>
  );
}
