"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { toEspnDarkLogoUrl } from "@/lib/espnLogos";

interface ThemeAdaptiveLogoProps {
  lightSrc?: string | null;
  darkSrc?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Exibe automaticamente a variante nativa da ESPN para Modo Claro (/500/) ou Modo Escuro (/500-dark/),
 * com fallback seguro para a versão padrão caso algum clube menor não possua versão dark no CDN.
 */
export function ThemeAdaptiveLogo({
  lightSrc,
  darkSrc,
  alt,
  className,
  fallback,
}: ThemeAdaptiveLogoProps) {
  const { resolvedTheme } = useTheme();
  const effectiveLight = lightSrc || undefined;
  const effectiveDark = darkSrc || toEspnDarkLogoUrl(effectiveLight);

  const preferredSrc =
    resolvedTheme === "dark"
      ? effectiveDark || effectiveLight
      : effectiveLight || effectiveDark;

  const [src, setSrc] = useState<string | undefined>(preferredSrc);

  useEffect(() => {
    setSrc(preferredSrc);
  }, [preferredSrc]);

  if (!src) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (effectiveLight && src !== effectiveLight) {
          setSrc(effectiveLight);
        }
      }}
    />
  );
}
