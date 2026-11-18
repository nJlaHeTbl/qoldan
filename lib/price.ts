// Display formatting for listing prices stored as free text ("80000 ₸", "12000", "Договорная").
// Plain numbers get Kazakhstan digit grouping (80 000 ₸); anything else is shown as written.
export function formatPriceText(price: string): string {
  const text = String(price ?? '').trim();
  const match = /^(\d+)\s*(₸|тг|тенге)?$/i.exec(text);
  if (!match) return text;
  const grouped = Number(match[1]).toLocaleString('ru-RU');
  return `${grouped} ₸`;
}
