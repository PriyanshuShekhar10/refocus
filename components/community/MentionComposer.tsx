"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MentionUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
};

type MentionComposerProps = {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

function getMentionQuery(
  text: string,
  cursor: number,
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  const between = before.slice(at + 1);
  if (between.includes("\n")) return null;
  if (!/^[a-z0-9_ .'.-]*$/i.test(between)) return null;
  return { query: between, start: at };
}

export default function MentionComposer({
  value,
  onChange,
  multiline = false,
  placeholder,
  disabled,
  className,
  onKeyDown,
  inputRef,
}: MentionComposerProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<MentionUser[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const localRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `/api/community/users/search?q=${encodeURIComponent(trimmed)}&limit=8`,
    );
    const data = (await res.json().catch(() => ({}))) as {
      users?: MentionUser[];
    };
    setResults(data.users ?? []);
    setHighlight(0);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const syncMentionState = (text: string, cursor: number) => {
    const mention = getMentionQuery(text, cursor);
    if (mention) {
      setMentionStart(mention.start);
      setOpen(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void search(mention.query);
      }, 200);
      return;
    }
    setOpen(false);
    setMentionStart(null);
    setResults([]);
  };

  const insertMention = (user: MentionUser) => {
    const el = ref.current;
    const cursor = el?.selectionStart ?? value.length;
    const start = mentionStart ?? cursor;
    const before = value.slice(0, start);
    const after = value.slice(cursor);
    const label = user.name.trim();
    const next = `${before}@${label} ${after}`;
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    setResults([]);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      const pos = before.length + label.length + 2;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (open && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((prev) => (prev + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((prev) => (prev - 1 + results.length) % results.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(results[highlight]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const sharedProps = {
    value,
    disabled,
    placeholder,
    onKeyDown: handleKeyDown,
    onChange: (
      e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    ) => {
      const next = e.target.value;
      onChange(next);
      syncMentionState(next, e.target.selectionStart ?? next.length);
    },
    onClick: (
      e: React.MouseEvent<HTMLTextAreaElement | HTMLInputElement>,
    ) => {
      const target = e.currentTarget;
      syncMentionState(target.value, target.selectionStart ?? target.value.length);
    },
    onKeyUp: (
      e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    ) => {
      const target = e.currentTarget;
      syncMentionState(target.value, target.selectionStart ?? target.value.length);
    },
  };

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          ref={ref as RefObject<HTMLTextAreaElement | null>}
          className={className}
          {...sharedProps}
        />
      ) : (
        <Input
          ref={ref as RefObject<HTMLInputElement | null>}
          className={className}
          {...sharedProps}
        />
      )}
      {open && results.length > 0 ? (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full min-w-[220px] overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {results.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70",
                index === highlight && "bg-muted/70",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(user)}
            >
              <Avatar className="h-6 w-6 shrink-0">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {user.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate font-medium">{user.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                @{user.username}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
