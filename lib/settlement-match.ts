/** Match free-text addresses using the selected place's historical/local names. */
export function matchesSettlement(address: string, query: string, aliases: string[] = []) {
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replaceAll('ё', 'е').trim().replace(/\s+/g, ' ');
  const needle = normalize(query);
  if (!needle) return true;
  const haystack = normalize(address);
  return [needle, ...aliases.map(normalize)].some(name => name.length > 0 && haystack.includes(name));
}
