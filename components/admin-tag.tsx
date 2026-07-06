type Props = {
  size?: "xs" | "sm";
  className?: string;
};

export function AdminTag({ size = "sm", className = "" }: Props) {
  const isXs = size === "xs";
  return (
    <span
      title="Refocus admin"
      className={`inline-flex shrink-0 items-center rounded-full font-semibold bg-[#5D1C6A]/12 text-[#5D1C6A] dark:bg-[#CA5995]/15 dark:text-[#FFB090] ${
        isXs ? "px-1 py-0 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      } ${className}`}
    >
      Admin
    </span>
  );
}
