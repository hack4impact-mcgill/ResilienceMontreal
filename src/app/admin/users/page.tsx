"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { RoleName } from "@prisma/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function AdminUsersPage() {
  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = api.users.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: roles } = api.users.roles.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const setRole = api.users.setRole.useMutation({
    onSuccess: () => {
      refetchUsers();
      alert("Role updated");
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to update role: " + (err?.message ?? "unknown"));
    },
  });

  const [selected, setSelected] = useState<Record<number, RoleName>>({});

  if (usersLoading) return <div>Loading users...</div>;

  // If the current user is not an admin, the server returns a FORBIDDEN error.
  if (usersError) {
    // show a friendly message for non-admins
    return (
      <div className="p-6">
        <h2 className="text-2xl mb-4">Access denied</h2>
        <p className="mb-4">
          You do not have permission to view this page. This area is for
          administrators only.
        </p>
        <Link href="/" className="underline">
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">User role management</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Current role</TableHead>
            <TableHead>Change to</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.role ?? "Unassigned"}</TableCell>
              <TableCell>
                <select
                  value={selected[u.id] ?? u.role ?? ""}
                  onChange={(e) =>
                    setSelected((s) => ({
                      ...s,
                      [u.id]: e.target.value as RoleName,
                    }))
                  }
                >
                  <option value="">-- select role --</option>
                  {roles?.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => {
                    const role = selected[u.id] ?? u.role;
                    if (!role) {
                      alert("Please select a role");
                      return;
                    }
                    setRole.mutate({ userId: u.id, role });
                  }}
                >
                  Save
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
