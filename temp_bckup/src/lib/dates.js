export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getRangeKeys(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => toDateKey(addDays(today, index - days + 1)));
}

export function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split("-");
  return `${month}.${day}.`;
}
