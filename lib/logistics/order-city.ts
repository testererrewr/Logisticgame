const aliases: readonly (readonly string[])[] = [
  ['wien', 'vienna', 'becs'],
  ['praha', 'prague', 'prag'],
  ['munchen', 'muenchen', 'munich'],
  ['warszawa', 'warsaw', 'warschau'],
  ['bratislava', 'pressburg', 'pozsony'],
];

export function foldOrderCity(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/ø/g, 'o')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function matchingOrderCities(names: readonly string[], query: string) {
  const key = foldOrderCity(query);
  if (!key) return [];
  const equivalents = aliases.find(group => group.includes(key)) ?? [key];
  const matches = names.filter(name => {
    const folded = foldOrderCity(name);
    return folded.includes(key) || equivalents.includes(folded);
  });
  return matches.sort((a, b) =>
    Number(equivalents.includes(foldOrderCity(b))) - Number(equivalents.includes(foldOrderCity(a)))
    || a.localeCompare(b, 'de'));
}
