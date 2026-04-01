"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "~/trpc/react";

export default function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = api.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setError(null);
      setMessage(
        data?.message ??
          "If an account exists for this email, we’ve sent a password reset link.",
      );
    },
    onError: (err) => {
      console.error("forgotPassword error:", err);
      setMessage(null);
      setError(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    mutation.mutate({ email });
  };

  return (
    <div
      className={`flex justify-center items-center w-full ${className ?? ""}`}
      {...props}
    >
      <Card className="w-[400px] bg-[#E9EFF1]">
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                className="bg-white"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#246178]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Sending reset link..." : "Send reset link"}
            </Button>

            {message && (
              <p className="text-sm text-muted-foreground text-center">
                {message}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-2 w-full text-sm underline underline-offset-4"
            >
              Back to login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
