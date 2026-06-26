import Link from "next/link";

import { SignupForm } from "@/components/signup-form";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <h1 className="text-2xl font-semibold">Start your private diary</h1>
        <p className="text-sm text-zinc-600">Recommendations from what you love, not just what you loop.</p>
        <SignupForm />
        <p className="text-sm text-zinc-600">
          Have an account? <Link className="text-violet-700" href="/auth/login">Login</Link>
        </p>
      </Card>
    </div>
  );
}
