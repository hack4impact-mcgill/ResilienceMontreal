"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDeadline,
  formatMoney,
  type DeadlineGrant,
} from "./deadlines-utils";

type GrantDeadlineDialogProps = {
  grant: DeadlineGrant | null;
  onClose: () => void;
};

export function GrantDeadlineDialog({
  grant,
  onClose,
}: GrantDeadlineDialogProps) {
  return (
    <Dialog open={grant !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{grant?.title ?? "Grant"}</DialogTitle>
          <DialogDescription>
            {grant ? `Deadline: ${formatDeadline(grant.deadline)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {grant && (
          <div className="flex flex-col gap-3 text-sm">
            {grant.description && (
              <p className="text-muted-foreground">{grant.description}</p>
            )}
            <p>
              <span className="font-medium">{formatMoney(grant.spent)}</span>
              <span className="text-muted-foreground">
                {" "}
                / {formatMoney(grant.total)}
              </span>
              <span className="text-muted-foreground"> spent</span>
            </p>
            <p className="text-muted-foreground">
              Funding pool: {grant.poolName}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
