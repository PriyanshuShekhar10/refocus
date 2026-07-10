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
      className={`shrink-0 border-t border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 ${
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
          className={`flex-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#5D1C6A] focus:bg-white dark:focus:border-[#CA5995] dark:focus:bg-gray-900 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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
              ? "border-[#5D1C6A] bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/40 dark:text-[#FFB090] dark:border-[#CA5995]"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#5D1C6A] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-[#FFB090]"
          } ${isModal ? "h-10 w-10" : "h-8 w-8"}`}
        >
          <FiCalendar size={isModal ? 16 : 14} />
        </button>
        <button
          onClick={handleSend}
          disabled={!canInteract || isSending || !text.trim()}
          aria-label="Send message"
          className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#5D1C6A] text-white shadow-sm hover:bg-[#CA5995] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isModal ? "h-10 w-10" : "h-8 w-8"
          }`}
        >
          <FiSend size={isModal ? 16 : 14} />
        </button>
      </div>
    </div>
  );
}
