import crypto from "crypto";

export function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates a human-readable passcode in the format: ABC-1234
 * 3 uppercase letters + dash + 4 digits
 */
export function generatePasscode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I, O to avoid confusion
  const digits = "0123456789";

  let code = "";
  for (let i = 0; i < 3; i++) {
    code += letters[crypto.randomInt(letters.length)];
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += digits[crypto.randomInt(digits.length)];
  }
  return code;
}
