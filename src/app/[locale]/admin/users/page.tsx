"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { api, type RouterOutputs } from "~/trpc/react";
import { RoleName } from "~/generated/prisma/enums";
import { DataTable } from "@/components/data-table/DataTable";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Order shown in the role menu. Unassigned is last: it's the "no role yet" state.
const ROLE_ORDER: RoleName[] = [
  RoleName.Admin,
  RoleName.InterventionTeam,
  RoleName.Bookkeeper,
  RoleName.Unassigned,
];

type PersonRow = RouterOutputs["users"]["list"][number];

export default function AdminUsersPage() {
  const t = useTranslations("people");
  const tCommon = useTranslations("common");
  const utils = api.useUtils();

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = api.users.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const { data: me } = api.users.me.useQuery();

  const setRole = api.users.setRole.useMutation({
    onSuccess: (updated) => {
      toast.success(
        t("roleUpdated", {
          name: updated.name,
          role: t(`role${updated.role}`),
        }),
      );
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => utils.users.list.invalidate(),
  });

  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users ?? [])
      .filter(
        (u) =>
          !query ||
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search]);

  const columns: ColumnDef<PersonRow>[] = [
    {
      id: "user",
      header: t("columnUser"),
      cell: ({ row }) => (
        <span>
          {row.original.name}
          {row.original.supabaseId === me?.supabaseId && (
            <span className="ml-1 text-muted-foreground">{t("you")}</span>
          )}
        </span>
      ),
    },
    {
      id: "email",
      header: t("columnEmail"),
      cell: ({ row }) => row.original.email,
    },
    {
      id: "role",
      header: t("columnRole"),
      cell: ({ row }) => {
        const person = row.original;
        const roleLabel = t(`role${person.role}`);

        // The server refuses changes to your own role, so don't offer them.
        if (person.supabaseId === me?.supabaseId) return roleLabel;

        const saving =
          setRole.isPending && setRole.variables?.userId === person.supabaseId;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={saving}
              aria-label={t("changeRoleFor", { name: person.name })}
              className="inline-flex items-center gap-1 rounded-sm px-1 -mx-1 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {roleLabel}
              <ChevronDown
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuRadioGroup
                value={person.role}
                onValueChange={(value) => {
                  if (value === person.role) return;
                  setRole.mutate({
                    userId: person.supabaseId,
                    role: value as RoleName,
                  });
                }}
              >
                {ROLE_ORDER.map((role) => (
                  <DropdownMenuRadioItem
                    key={role}
                    value={role}
                    className="cursor-pointer items-start"
                  >
                    <div className="flex flex-col">
                      <span>{t(`role${role}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`role${role}Description`)}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (usersLoading) return <TableLoadingState />;

  // Non-admins get FORBIDDEN from the server.
  if (usersError?.data?.code === "FORBIDDEN") {
    return (
      <div className="p-6">
        <h2 className="text-2xl mb-4">{t("accessDeniedTitle")}</h2>
        <p className="mb-4">{t("accessDeniedBody")}</p>
        <Link href="/" className="underline">
          {t("returnHome")}
        </Link>
      </div>
    );
  }

  if (usersError) {
    return <div className="p-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl mb-4">{t("title")}</h1>
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage={t("noResults")}
        toolbar={
          <Input
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        }
      />
    </div>
  );
}
