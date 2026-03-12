"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "~/trpc/react";

export default function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = api.auth.updatePassword.useMutation({
    onSuccess: (data) => {
      setError(null);
      setMessage(
        data?.message ?? "Your password has been updated successfully.",
      );
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },
    onError: (err) => {
      console.error("updatePassword error:", err);
      setMessage(null);
      setError(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    mutation.mutate({ password });
  };

  return (
    <div
      className={`flex justify-center items-center w-full ${className ?? ""}`}
      {...props}
    >
      <Card className="w-[400px] bg-[#E9EFF1]">
        <CardHeader>
          <CardTitle className="text-2xl">Change your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                className="bg-white"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className="bg-white"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#246178]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Update password"}
            </Button>

            {message && (
              <p className="text-sm text-muted-foreground text-center">
                {message}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

