export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi")
    .replace(/#+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function matchesSearchQuery(
  query: string,
  searchableText: string,
  hashtags: readonly string[] = [],
): boolean {
  const rawQuery = query.trim();
  if (!rawQuery) return true;

  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return false;

  const isHashtagQuery = rawQuery.normalize("NFKC").startsWith("#");
  if (isHashtagQuery) {
    return hashtags.some((tag) => normalizeSearchText(tag).includes(normalizedQuery));
  }

  return normalizeSearchText(`${searchableText} ${hashtags.join(" ")}`).includes(normalizedQuery);
}
