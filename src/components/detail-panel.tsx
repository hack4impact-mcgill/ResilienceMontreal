"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteConfirmDialog } from "@/components/data-table/DeleteConfirmDialog";
import { TableErrorState } from "@/components/data-table/TableErrorState";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** First Zod field error from a tRPC error, falling back to its message. */
export function mutationErrorMessage(err: {
  message: string;
  data?: {
    zodError?: { fieldErrors: Record<string, string[] | undefined> } | null;
  } | null;
}) {
  const fieldErrors = err.data?.zodError?.fieldErrors ?? {};
  const first = Object.values(fieldErrors).find((msgs) => msgs?.length)?.[0];
  return first ?? err.message;
}

/** Open/close wiring a table passes to its entity panel, from useDetailPanel. */
export type DetailPanelControls = {
  onClose: () => void;
  // false when switching rows, so only opening slides in
  animateIn: boolean;
  // true while the slide-out plays; onExited fires when it ends
  closing: boolean;
  onExited: () => void;
};

/**
 * Which row's panel is open. Closing first plays the slide-out, then clears
 * the id (straight away when the viewer prefers reduced motion).
 */
export function useDetailPanel() {
  const [id, setId] = React.useState<number | null>(null);
  const [closing, setClosing] = React.useState(false);
  const [animateIn, setAnimateIn] = React.useState(true);
  // a ref so open() stays stable for memoized table columns
  const shownRef = React.useRef(false);

  const open = React.useCallback((next: number) => {
    setAnimateIn(!shownRef.current);
    shownRef.current = true;
    setClosing(false);
    setId(next);
  }, []);
  const onExited = React.useCallback(() => {
    setClosing(false);
    setId(null);
  }, []);
  const onClose = React.useCallback(() => {
    shownRef.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onExited();
    } else {
      setClosing(true);
    }
  }, [onExited]);

  return { id, open, controls: { onClose, animateIn, closing, onExited } };
}

interface Props extends DetailPanelControls {
  title: string;
  // full-page view of the same record ("View as page")
  pageHref: string;
  isLoading: boolean;
  loadError?: string | null;
  editing: boolean;
  // hides Edit/Save when the viewer may not edit
  canEdit?: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  isSaving?: boolean;
  // save/delete failure, shown under the header
  error?: string | null;
  // hides Delete when the viewer may not delete
  canDelete?: boolean;
  onDelete: () => void;
  isDeleting?: boolean;
  deleteName?: string;
  deleteDescription?: string;
  notes?: React.ReactNode;
  children: React.ReactNode;
}

// Dividers run edge to edge, past the panel's side padding.
const DIVIDER = "w-auto max-md:-mx-6 md:-ml-8";

/** Table on the left, the open record's DetailPanel (if any) on the right. */
export function DetailSplit({
  panel,
  children,
}: {
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // One top line across both halves, so it stays put while the panel slides.
    // -mx-8/px-8 run it into the page's p-8 padding, as the table toolbar did.
    <div className="-mx-8 flex items-start gap-8 border-t border-border px-8">
      <div className="min-w-0 flex-1">{children}</div>
      {panel}
    </div>
  );
}

/**
 * Side panel for one table row: its fields, Edit/Save, View as page, Back and
 * Delete. Each table supplies the fields and the save/delete calls.
 * Render it through DetailSplit so the table stays usable beside it.
 */
export function DetailPanel({
  title,
  pageHref,
  onClose,
  animateIn,
  closing,
  onExited,
  isLoading,
  loadError,
  editing,
  canEdit = true,
  onEdit,
  onCancelEdit,
  onSave,
  isSaving = false,
  error,
  canDelete = true,
  onDelete,
  isDeleting = false,
  deleteName,
  deleteDescription,
  notes,
  children,
}: Props) {
  const t = useTranslations("common");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const ready = !isLoading && !loadError;
  const panelRef = React.useRef<HTMLElement>(null);

  // Click outside or Esc closes the panel. While editing, outside clicks are
  // swallowed instead so a stray click can't discard the changes.
  React.useEffect(() => {
    // the delete pop-up handles its own clicks and Esc
    if (confirmingDelete || closing) return;

    const isOutside = (e: Event) =>
      !panelRef.current?.contains(e.target as Node);
    const swallowWhileEditing = (e: Event) => {
      if (editing && isOutside(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // Row ⋯ menus switch the panel to another record instead of closing it.
    // Checked where the press started: the menu opens on press and blocks
    // pointer events on the page, so the click itself lands on <html>.
    const isMenu = (e: Event) =>
      (e.target as Element).closest('[aria-haspopup="menu"], [role="menu"]');
    let pressedOnMenu = false;
    const onPointerDown = (e: PointerEvent) => {
      if (editing) return swallowWhileEditing(e);
      pressedOnMenu = Boolean(isMenu(e));
    };
    // Closing on click (not pointerdown) lets the clicked control act before
    // the table widens back to full width.
    const onClick = (e: MouseEvent) => {
      const fromMenu = pressedOnMenu;
      pressedOnMenu = false;
      if (!isOutside(e)) return;
      if (editing) return swallowWhileEditing(e);
      if (fromMenu || isMenu(e)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) onClose();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editing, confirmingDelete, closing, onClose]);

  return (
    <aside
      ref={panelRef}
      aria-label={title}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onExited();
      }}
      // Full screen on narrow viewports; beside the table from md up.
      // contain:inline-size keeps long unbreakable text (emails, links) from
      // widening the page, so the panel stays half width for every record.
      className={cn(
        "duration-300 slide-in-from-right slide-out-to-right fill-mode-forwards",
        closing ? "animate-out" : animateIn && "animate-in",
        "flex flex-col gap-6 bg-background max-md:fixed max-md:inset-0 max-md:z-40 max-md:overflow-y-auto max-md:p-6 md:sticky md:top-0 md:h-screen md:w-1/2 md:shrink-0 md:[contain:inline-size] md:overflow-y-auto md:border-l md:py-4 md:pl-8",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {ready && canEdit && editing && (
            <>
              <Button
                variant="outline"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="outline"
                // the app's teal accent, as on the other pages
                className="border-[#3FA9A9] text-[#3FA9A9] hover:text-[#3FA9A9]"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? t("saving") : t("save")}
              </Button>
            </>
          )}
          {ready && canEdit && !editing && (
            <Button variant="outline" onClick={onEdit}>
              {t("edit")}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={pageHref}>{t("viewAsPage")}</Link>
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("back")}
          </Button>
        </div>
      </div>
      <Separator className={DIVIDER} />
      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <TableLoadingState />
      ) : loadError ? (
        <TableErrorState message={loadError} />
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">{t("information")}</h3>
            {children}
          </section>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">{notes}</div>
            {canDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
                disabled={isDeleting || isSaving}
              >
                {t("delete")}
              </Button>
            )}
          </div>
          <Separator className={DIVIDER} />
        </>
      )}

      <DeleteConfirmDialog
        open={confirmingDelete}
        entityName={deleteName}
        description={deleteDescription}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </aside>
  );
}
