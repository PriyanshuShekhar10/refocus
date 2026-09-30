import { useState } from "react";
import { FiCalendar, FiSend } from "react-icons/fi";

export type FriendChatInputProps = {
  canInteract: boolean;
  verifyMessage: string | null;
  friendLabel: string;
  isModal: boolean;
  srOpen: boolean;
  setSrOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  onSend: (text: string) => Promise<void>;
};

export default function FriendChatInput({
  canInteract,
  verifyMessage,
  friendLabel,
  isModal,
  srOpen,
  setSrOpen,
  onSend,
}: FriendChatInputProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const value = text.trim();
    if (!value || !canInteract || isSending) return;
    
    setText("");
    setIsSending(true);
    try {
      await onSend(value);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`shrink-0 border-t border-rf-line/70 bg-rf-card ${
        isModal ? "px-5 py-4" : "p-3"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={
            canInteract
              ? `Message ${friendLabel.split(/[@\s]/)[0] || "friend"}…`
              : verifyMessage || ""
          }
          disabled={!canInteract || isSending}
          className={`flex-1 rounded-full border border-rf-line bg-rf-bg text-rf-ink placeholder:text-rf-ink-mute focus:outline-none focus:border-rf-primary focus:bg-rf-line-soft transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isModal ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-sm"
          }`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={() => canInteract && setSrOpen((v: boolean) => !v)}
          disabled={!canInteract}
          aria-label={srOpen ? "Close session request" : "Send session request"}
          title={canInteract ? "Send session request" : verifyMessage || ""}
          className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors ${
            srOpen
              ? "border-rf-primary bg-rf-cream-bg text-rf-plum-ink"
              : "border-rf-line bg-rf-card text-rf-ink-soft hover:bg-rf-line-soft hover:text-rf-plum-ink"
          } ${isModal ? "h-10 w-10" : "h-8 w-8"}`}
        >
          <FiCalendar size={isModal ? 16 : 14} />
        </button>
        <button
          onClick={handleSend}
          disabled={!canInteract || isSending || !text.trim()}
          aria-label="Send message"
          className={`inline-flex shrink-0 items-center justify-center rounded-full bg-rf-primary text-rf-on-primary shadow-sm hover:bg-rf-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isModal ? "h-10 w-10" : "h-8 w-8"
          }`}
        >
          <FiSend size={isModal ? 16 : 14} />
        </button>
      </div>
    </div>
  );
}
