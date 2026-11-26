export interface ESPNLogoItem {
  href: string;
  rel?: string[];
}

/**
 * Converte uma URL padrão do CDN da ESPN (/500/) para sua variante nativa de modo escuro (/500-dark/).
 * Funciona tanto para logos de ligas (leaguelogos) quanto de clubes (teamlogos).
 */
export function toEspnDarkLogoUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes("/500-dark/")) return url;
  if (url.includes("/500/")) {
    return url.replace("/500/", "/500-dark/");
  }
  return url;
}

/**
 * Extrai os URLs nativos de modo claro (default) e modo escuro (dark) do array `logos` da API da ESPN.
 */
export function extractEspnLogos(
  logos?: ESPNLogoItem[] | null,
  fallbackSingleLogo?: string | null
): { light?: string; dark?: string } {
  const defaultLogo =
    logos?.find((l) => l.rel?.includes("default"))?.href ||
    logos?.[0]?.href ||
    fallbackSingleLogo ||
    undefined;

  const darkLogo =
    logos?.find((l) => l.rel?.includes("dark"))?.href ||
    toEspnDarkLogoUrl(defaultLogo);

  return { light: defaultLogo, dark: darkLogo };
}
