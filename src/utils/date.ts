import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';

/**
 * Parses any date input safely (ISO string, Date object, or timestamp)
 */
export const safeParseDate = (dateInput: string | Date | number | null | undefined): Date | null => {
  if (!dateInput) return null;
  try {
    const parsed = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
    return isValid(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
};

/**
 * Formats date into a short date string (e.g., "Jul 27, 2026")
 */
export const formatShortDate = (dateInput: string | Date | number | null | undefined, fallback = '—'): string => {
  const parsed = safeParseDate(dateInput);
  if (!parsed) return fallback;
  return format(parsed, 'MMM dd, yyyy');
};

/**
 * Formats date into date + time string (e.g., "Jul 27, 2026 · 05:19 PM")
 */
export const formatDateTime = (
  dateInput: string | Date | number | null | undefined,
  includeTime = true,
  fallback = '—'
): string => {
  const parsed = safeParseDate(dateInput);
  if (!parsed) return fallback;
  return includeTime ? format(parsed, 'MMM dd, yyyy · hh:mm a') : format(parsed, 'MMM dd, yyyy');
};

/**
 * Formats date relative to now (e.g., "10 minutes ago", "2 days ago")
 */
export const formatRelativeDate = (dateInput: string | Date | number | null | undefined, fallback = '—'): string => {
  const parsed = safeParseDate(dateInput);
  if (!parsed) return fallback;
  return `${formatDistanceToNow(parsed, { addSuffix: true })}`;
};

/**
 * Formats date for table column displays
 */
export const formatTableDate = (dateInput: string | Date | number | null | undefined, fallback = '—'): string => {
  return formatShortDate(dateInput, fallback);
};
