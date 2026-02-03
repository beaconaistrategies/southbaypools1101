import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUTCDate(dateString: string | Date, formatStr: string): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return format(utcDate, formatStr);
}
