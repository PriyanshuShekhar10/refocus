"use client";

import { useState } from "react";
import { Ban, Flag, MoreHorizontal, Trash2, VolumeX, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  targetUserId: string;
  targetLabel: string;
  onDeleteContent?: () => Promise<void>;
  deleteLabel?: string;
  onReport?: () => void;
  onBlock?: () => void;
  onModerate: (
    userId: string,
    action: "ban" | "unban" | "mute" | "unmute",
    muteDays?: number,
  ) => Promise<void>;
};

export default function CommunityModerationMenu({
  targetUserId,
  targetLabel,
  onDeleteContent,
  deleteLabel = "Delete",
  onReport,
  onBlock,
  onModerate,
}: Props) {
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Moderation actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onReport ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onReport}
          >
            <Flag className="h-4 w-4" />
            Report
          </DropdownMenuItem>
        ) : null}
        {onBlock ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onBlock}
          >
            <Ban className="h-4 w-4" />
            Block
          </DropdownMenuItem>
        ) : null}
        {(onReport || onBlock) && onDeleteContent ? (
          <DropdownMenuSeparator />
        ) : null}
        {onDeleteContent ? (
          <>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                run(async () => {
                  if (!confirm(`Delete this ${deleteLabel.toLowerCase()}?`)) return;
                  await onDeleteContent();
                })
              }
            >
              <Trash2 className="h-4 w-4" />
              {deleteLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <VolumeX className="h-4 w-4" />
            Mute {targetLabel}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {[1, 7, 30].map((days) => (
              <DropdownMenuItem
                key={days}
                onClick={() =>
                  run(async () => {
                    if (
                      !confirm(
                        `Mute ${targetLabel} for ${days} day${days === 1 ? "" : "s"}?`,
                      )
                    ) {
                      return;
                    }
                    await onModerate(targetUserId, "mute", days);
                  })
                }
              >
                {days} day{days === 1 ? "" : "s"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          onClick={() =>
            run(async () => {
              if (!confirm(`Unmute ${targetLabel}?`)) return;
              await onModerate(targetUserId, "unmute");
            })
          }
        >
          <Volume2 className="h-4 w-4" />
          Unmute
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            run(async () => {
              if (
                !confirm(
                  `Ban ${targetLabel} from community? They will not be able to post, chat, or book sessions.`,
                )
              ) {
                return;
              }
              await onModerate(targetUserId, "ban");
            })
          }
        >
          <Ban className="h-4 w-4" />
          Ban from community
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
