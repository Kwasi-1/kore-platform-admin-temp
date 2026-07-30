import { useMemo } from 'react';
import {
  formatShortDate,
  formatDateTime,
  formatRelativeDate,
  formatTableDate,
  safeParseDate,
} from '@/utils/date';

export function useDateFormat() {
  return useMemo(
    () => ({
      formatShortDate,
      formatDateTime,
      formatRelativeDate,
      formatTableDate,
      safeParseDate,
    }),
    []
  );
}

export default useDateFormat;
