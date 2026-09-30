export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 whitespace-nowrap rounded-full bg-rf-ink px-4 py-2.5 text-[13px] font-medium text-rf-bg shadow-[0_8px_24px_rgba(0,0,0,.2)]"
    >
      {message}
    </div>
  );
}
