export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidationResult {
  strength: PasswordStrength;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    specialChar: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = {
    length: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*()_+\-=[\]{}|;':",./<>?]/.test(password),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;
  let strength: PasswordStrength = "weak";
  if (metCount >= 5) strength = "strong";
  else if (metCount >= 3) strength = "medium";

  return { strength, requirements };
}
