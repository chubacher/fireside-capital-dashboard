
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function getRaw(value) {
  return parseFloat(value) || 0;
}

export function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}

// Add this function to your charts.js or utility.js

export function getNextDate(currentDate, frequency) {
  const date = new Date(currentDate);
  switch (frequency.toLowerCase()) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
  return date;
}