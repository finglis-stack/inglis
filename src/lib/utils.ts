import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(dobString: string): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function validateLuhnAlphanumeric(pan: string): boolean {
  if (typeof pan !== 'string' || pan.length !== 18) {
    return false;
  }

  const base = pan.substring(0, 17);
  const checkDigit = parseInt(pan.substring(17, 18), 10);

  if (isNaN(checkDigit)) {
    return false;
  }

  const alphanumericToNumeric = (str: string): string => {
    return str.split('').map(char => {
      if (char >= '0' && char <= '9') {
        return char;
      }
      if (char >= 'A' && char <= 'Z') {
        return (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
      }
      return '';
    }).join('');
  };

  const numericBase = alphanumericToNumeric(base);

  let sum = 0;
  let alternate = false;
  for (let i = numericBase.length - 1; i >= 0; i--) {
    let n = parseInt(numericBase.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }
    sum += n;
    alternate = !alternate;
  }

  const calculatedCheckDigit = (sum * 9) % 10;

  return calculatedCheckDigit === checkDigit;
}

export function getFunctionError(error: any, fallbackMessage: string = 'An unknown error occurred.'): string {
  if (error?.context?.error) {
    // This handles errors from my edge functions that return { error: '...' }
    return error.context.error;
  }
  if (error instanceof Error) {
    // This handles generic JS errors and Supabase client errors
    return error.message;
  }
  // Fallback for other cases
  return fallbackMessage;
}