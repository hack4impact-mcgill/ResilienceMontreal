"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  // href renders a real link (supports middle-click / open in new tab)
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}

interface Props {
  label?: string;
  actions: Action[];
}

export function RowActionsDropdown({ label, actions }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        {actions.map((action) => {
          const className = cn(
            "cursor-pointer",
            // keep red while hovered/focused (menu items default to accent text on focus)
            action.destructive && "text-destructive focus:text-destructive",
          );
          return action.href ? (
            <DropdownMenuItem key={action.label} className={className} asChild>
              <Link href={action.href}>{action.label}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={action.label}
              className={className}
              onClick={action.onClick}
            >
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
