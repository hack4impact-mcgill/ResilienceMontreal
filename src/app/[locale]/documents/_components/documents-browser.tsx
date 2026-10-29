"use client";

import React from "react";
import NextLink from "next/link";
import {
  Download,
  File,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "~/trpc/react";

const FOLDER = "application/vnd.google-apps.folder";

export function DocumentsBrowser() {
  const [folderId, setFolderId] = React.useState<string | undefined>();
  const [trail, setTrail] = React.useState<{ id?: string; name: string }[]>([
    { name: "Documents Home" },
  ]);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const { data: status, isLoading: loadingStatus } =
    api.documents.status.useQuery();
  const {
    data: files = [],
    isLoading,
    error,
  } = api.documents.list.useQuery(
    { folderId },
    { enabled: Boolean(status?.connected) },
  );
  const { data: currentUser } = api.users.me.useQuery();
  const createFolder = api.documents.createFolder.useMutation({
    onSuccess: () => {
      void utils.documents.list.invalidate();
      toast.success("Folder created");
    },
    onError: (e) => toast.error(e.message),
  });
  const rename = api.documents.rename.useMutation({
    onSuccess: () => {
      void utils.documents.list.invalidate();
      toast.success("Renamed");
    },
    onError: (e) => toast.error(e.message),
  });
  const trash = api.documents.trash.useMutation({
    onSuccess: () => {
      void utils.documents.list.invalidate();
      toast.success("Moved to Google Drive trash");
    },
    onError: (e) => toast.error(e.message),
  });
  const isAdmin = currentUser?.role === "Admin";

  const open = (id: string, name: string) => {
    setFolderId(id);
    setTrail((old) => [...old, { id, name }]);
  };
  const goTo = (index: number) => {
    const next = trail.slice(0, index + 1);
    setTrail(next);
    setFolderId(next.at(-1)?.id);
  };
  const makeFolder = () => {
    const name = window.prompt("Folder name");
    if (name?.trim())
      createFolder.mutate({ name: name.trim(), parentId: folderId });
  };
  const renameItem = (id: string, currentName: string) => {
    const name = window.prompt("New name", currentName);
    if (name?.trim() && name.trim() !== currentName)
      rename.mutate({ id, name: name.trim() });
  };
  const trashItem = (id: string, name: string) => {
    if (window.confirm(`Move “${name}” to Google Drive trash?`)) {
      trash.mutate({ id });
    }
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    if (folderId) form.set("parentId", folderId);
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      toast.success("Document uploaded");
      await utils.documents.list.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (loadingStatus)
    return <div className="p-8 text-muted-foreground">Loading documents…</div>;
  if (!status?.configured)
    return (
      <SetupCard message="Google Drive has not been configured yet. Add the Google Drive credentials and folder ID, then an administrator can connect the shared account." />
    );
  if (!status.connected)
    return (
      <SetupCard
        message="Google Drive is ready to be connected to the shared account."
        connect={isAdmin}
      />
    );

  return (
    <section className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-4xl">Documents</h1>
        <p className="mt-2 text-muted-foreground">
          Shared documents are stored in the organization’s Google Drive.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 text-sm">
          {trail.map((item, index) => (
            <React.Fragment key={item.id ?? "root"}>
              <button
                className="rounded px-1 text-primary hover:underline"
                onClick={() => goTo(index)}
              >
                {item.name}
              </button>
              {index < trail.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </nav>
        <div className="flex gap-2">
          <Button variant="outline" onClick={makeFolder}>
            <FolderPlus /> New folder
          </Button>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}{" "}
            Upload
          </Button>
          <Input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={upload}
          />
        </div>
      </div>
      {error ? (
        <p className="rounded border border-destructive p-4 text-destructive">
          {error.message}
        </p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading files…</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {files.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">
              This folder is empty.
            </p>
          ) : (
            files.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <button
                  className="flex min-w-0 items-center gap-3 text-left"
                  onClick={() =>
                    item.mimeType === FOLDER && open(item.id, item.name)
                  }
                  disabled={item.mimeType !== FOLDER}
                >
                  {item.mimeType === FOLDER ? (
                    <Folder className="shrink-0 text-amber-500" />
                  ) : (
                    <File className="shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Rename ${item.name}`}
                    className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => renameItem(item.id, item.name)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => trashItem(item.id, item.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                  {item.mimeType !== FOLDER && (
                    <a
                      href={`/api/documents/download?id=${encodeURIComponent(item.id)}`}
                      className="ml-1 inline-flex shrink-0 items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function SetupCard({
  message,
  connect = false,
}: {
  message: string;
  connect?: boolean;
}) {
  return (
    <section className="max-w-xl rounded-lg border p-6">
      <h1 className="text-2xl font-semibold">Documents setup</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      {connect && (
        <Button className="mt-5" asChild>
          <NextLink href="/api/documents/google/connect">
            Connect the shared Google account
          </NextLink>
        </Button>
      )}
    </section>
  );
}
