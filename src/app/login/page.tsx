"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl =
    callbackUrlParam?.startsWith("/") && !callbackUrlParam.startsWith("//")
      ? callbackUrlParam
      : "/dashboard";

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (!result) {
        throw new Error("No response from authentication server");
      }

      if (result.error) {
        throw new Error("Invalid email or password");
      }

      router.replace(callbackUrl);
      router.refresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            required
          />

          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            required
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="text-sm text-center text-neutral-500 mt-6">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="text-black font-medium hover:underline"
          >
            Register
          </a>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
          <Card className="w-full max-w-md p-8">
            <div className="h-8 w-40 bg-neutral-200 dark:bg-neutral-700 rounded mx-auto mb-6 animate-pulse" />
            <div className="space-y-4">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded mt-4 animate-pulse" />
            </div>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
