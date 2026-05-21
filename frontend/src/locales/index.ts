import { vi } from "./vi";
import { en } from "./en";

export const translations = {
  vi,
  en,
};

export type TranslationKey = keyof typeof vi;
export type Language = "vi" | "en";
