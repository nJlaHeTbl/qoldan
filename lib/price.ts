// Display formatting for listing prices stored as free text ("80000 ₸", "12000", "Договорная").
// Plain numbers get Kazakhstan digit grouping (80 000 ₸); anything else is shown as written.
export function formatPriceText(price: string): string {
  const text = String(price ?? '').trim();
  const match = /^(\d+)\s*(₸|тг|тенге)?$/i.exec(text);
  if (!match) return text;
  const grouped = Number(match[1]).toLocaleString('ru-RU');
  return `${grouped} ₸`;
}

// Numeric value of a free-text price for comparisons ("18 000 ₸" → 18000). Null when there is no
// plain amount ("Договорная", "от 5 000", ranges), so a vague price never triggers a "dropped" notice.
export function priceNumber(price: string | null | undefined): number | null {
  const text = String(price ?? '').replace(/[\s\u00a0\u202f]/g, '').toLowerCase();
  const match = /^(\d{1,12})(₸|тг|тенге|kzt)?$/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value > 0 ? value : null;
}
