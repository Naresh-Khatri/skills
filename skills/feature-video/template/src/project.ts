// per-project settings; init writes this once, kit updates never touch it
export const project = {
  name: "Acme",
  // file in public/; null -> name only
  logo: "brand/logo.svg" as string | null,
  // 6-digit hex; drives highlights, chips, backdrop glow
  accent: "#2fe89a",
  // web recordings
  locale: "en-US",
  timezone: "UTC",
  colorScheme: "dark" as "dark" | "light",
  // extra css selectors hidden in web recordings (chat widgets, cookie banners, dev badges)
  hide: [] as string[],
};
