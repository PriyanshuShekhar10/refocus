"use client";

import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";

// ============================================
// Types
// ============================================

interface DurationSelectorBaseProps {
  /** Custom duration options (defaults to DURATION_OPTIONS from config) */
  options?: readonly DurationMin[];
  /** Additional CSS classes */
  className?: string;
  /** Label text displayed above the selector */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

interface SingleSelectProps extends DurationSelectorBaseProps {
  /** Selection mode */
  mode: "single";
  /** Currently selected duration */
  selected: DurationMin;
  /** Callback when selection changes */
  onChange: (duration: DurationMin) => void;
  /** Visual variant for selected state */
  variant?: "primary" | "success";
}

interface MultiSelectProps extends DurationSelectorBaseProps {
  /** Selection mode */
  mode: "multi";
  /** Currently selected durations */
  selected: DurationMin[];
  /** Callback when selection changes */
  onChange: (duration: DurationMin) => void;
  /** Visual variant for selected state */
  variant?: "primary" | "success";
}

type DurationSelectorProps = SingleSelectProps | MultiSelectProps;

// ============================================
// Styles Configuration
// ============================================

const VARIANT_STYLES = {
  primary: {
    selected:
      "border-[#CA5995] bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/30 dark:text-[#FFB090]",
    unselected: "border-gray-200 dark:border-gray-700",
  },
  success: {
    selected:
      "border-[#CA5995] bg-[#FFF1D3] text-[#5D1C6A] dark:bg-[#5D1C6A]/20 dark:text-[#FFB090]",
    unselected: "border-gray-200 dark:border-gray-700",
  },
} as const;

// ============================================
// Component
// ============================================

/**
 * DurationSelector - A reusable button group for selecting session durations.
 *
 * Supports two modes:
 * - "single": Only one duration can be selected at a time
 * - "multi": Multiple durations can be selected (toggle behavior)
 *
 * @example Single select (for creating new sessions)
 * ```tsx
 * <DurationSelector
 *   mode="single"
 *   selected={createDuration}
 *   onChange={setCreateDuration}
 *   variant="success"
 *   label="New session length"
 * />
 * ```
 *
 * @example Multi select (for filtering)
 * ```tsx
 * <DurationSelector
 *   mode="multi"
 *   selected={durationFilter}
 *   onChange={handleDurationFilterChange}
 *   variant="primary"
 *   label="Duration (minutes)"
 * />
 * ```
 */
export function DurationSelector(props: DurationSelectorProps) {
  const {
    options = DURATION_OPTIONS,
    className = "",
    label,
    disabled = false,
    variant = "primary",
  } = props;

  const isSelected = (duration: DurationMin): boolean => {
    if (props.mode === "single") {
      return props.selected === duration;
    }
    return props.selected.includes(duration);
  };

  const handleClick = (duration: DurationMin) => {
    if (disabled) return;
    props.onChange(duration);
  };

  const styles = VARIANT_STYLES[variant];

  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      )}
      <div
        className="mt-2 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, 1fr)`,
        }}
      >
        {options.map((duration) => (
          <button
            key={`duration-${duration}`}
            type="button"
            onClick={() => handleClick(duration)}
            disabled={disabled}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
              isSelected(duration) ? styles.selected : styles.unselected
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"}`}
            aria-pressed={isSelected(duration)}
            aria-label={`${duration} minutes`}
          >
            {duration}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DurationSelector;
