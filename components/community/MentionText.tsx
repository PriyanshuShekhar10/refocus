"use client";

import { splitMentionContent } from "@/lib/communityMentions";

type MentionTextProps = {
  content: string;
  className?: string;
  onMentionClick?: (label: string) => void;
};

export default function MentionText({
  content,
  className,
  onMentionClick,
}: MentionTextProps) {
  const parts = splitMentionContent(content);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.text}</span>;
        }
        if (onMentionClick) {
          return (
            <span
              key={index}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMentionClick(part.label);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onMentionClick(part.label);
                }
              }}
              className="cursor-pointer font-medium text-rf-plum-ink hover:underline"
            >
              @{part.label}
            </span>
          );
        }
        return (
          <span
            key={index}
            className="font-medium text-rf-plum-ink"
          >
            @{part.label}
          </span>
        );
      })}
    </span>
  );
}
