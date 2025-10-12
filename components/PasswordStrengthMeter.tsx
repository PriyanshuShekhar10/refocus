import { PasswordValidationResult } from "@/lib/validatePassword";

interface Props {
  validation: PasswordValidationResult;
}

const colors = {
  weak: "bg-red-500",
  medium: "bg-yellow-500",
  strong: "bg-green-500",
};

export function PasswordStrengthMeter({ validation }: Props) {
  const { strength, requirements } = validation;

  return (
    <div className="mt-2 space-y-2">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${colors[strength]} transition-all duration-300`}
          style={{
            width:
              strength === "weak"
                ? "33%"
                : strength === "medium"
                ? "66%"
                : "100%",
          }}
        />
      </div>
      <p
        className={`text-sm font-medium ${
          strength === "weak"
            ? "text-red-500"
            : strength === "medium"
            ? "text-yellow-600"
            : "text-green-600"
        }`}
      >
        {strength.charAt(0).toUpperCase() + strength.slice(1)} password
      </p>

      <ul className="text-xs space-y-1">
        <Requirement
          label="At least 8 characters"
          valid={requirements.length}
        />
        <Requirement
          label="One uppercase letter"
          valid={requirements.uppercase}
        />
        <Requirement
          label="One lowercase letter"
          valid={requirements.lowercase}
        />
        <Requirement label="One number" valid={requirements.number} />
        <Requirement
          label="One special character"
          valid={requirements.specialChar}
        />
      </ul>
    </div>
  );
}

function Requirement({ label, valid }: { label: string; valid: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {valid ? (
        <span className="text-green-500">✅</span>
      ) : (
        <span className="text-red-500">❌</span>
      )}
      {label}
    </li>
  );
}
