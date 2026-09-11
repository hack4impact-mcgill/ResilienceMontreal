"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

export default function UnauthorizedPage() {
  const { data: user } = api.users.me.useQuery();

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Access Denied</h2>
      <p className="mb-4">
        You don&apos;t have permission to access this page. Only Intervention
        Team members can access client data.
      </p>
      {user?.role && (
        <p className="mb-4 text-muted-foreground">
          Your current role: <span className="font-semibold">{user.role}</span>
        </p>
      )}
      <p className="mb-4">
        If you believe you should have access to this page, please contact an
        administrator to update your role.
      </p>
      <Link href="/" className="underline">
        Return to home
      </Link>
    </div>
  );
}
