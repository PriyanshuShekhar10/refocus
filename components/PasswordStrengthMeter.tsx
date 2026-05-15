import { Check, X } from "lucide-react";
import type { PasswordValidationResult } from "@/lib/validatePassword";
import { designStyles } from "@/components/design";

interface Props {
  validation: PasswordValidationResult;
}

const STRENGTH_LABELS = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

export function PasswordStrengthMeter({ validation }: Props) {
  const { strength, requirements } = validation;

  const filled = strength === "weak" ? 1 : strength === "medium" ? 2 : 3;
  const strengthBar =
    strength === "weak"
      ? designStyles.strengthBarWeak
      : strength === "medium"
      ? designStyles.strengthBarMedium
      : designStyles.strengthBarStrong;

  return (
    <div>
      <div className={designStyles.strengthRow}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`${designStyles.strengthBar} ${
              i <= filled ? strengthBar : ""
            }`}
          />
        ))}
      </div>
      <div className={designStyles.strengthLabel}>
        {STRENGTH_LABELS[strength]} password
      </div>
      <div className={designStyles.strengthReqs}>
        <Requirement label="8+ characters" valid={requirements.length} />
        <Requirement label="One uppercase" valid={requirements.uppercase} />
        <Requirement label="One lowercase" valid={requirements.lowercase} />
        <Requirement label="One number" valid={requirements.number} />
        <Requirement label="One symbol" valid={requirements.specialChar} />
      </div>
    </div>
  );
}

function Requirement({ label, valid }: { label: string; valid: boolean }) {
  return (
    <span
      className={valid ? designStyles.strengthReqMet : ""}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {valid ? <Check size={12} /> : <X size={12} />}
      {label}
    </span>
  );
}
