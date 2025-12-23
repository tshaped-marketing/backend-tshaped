import { format } from 'date-fns';

export const formatDateTime = (date: Date | string | number): string => {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }

    return format(dateObj, 'dd MMM yyyy'); // e.g., 08 May 2025
  } catch (error) {
    console.error('Error formatting date:', error);
    throw new Error('Failed to format date');
  }
};
