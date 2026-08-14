import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

export function getDomain(url: string): string {
  let normalized = url.trim();
  if (normalized && !/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  const match = normalized.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
  if (match?.[1]) {
    return match[1].replace(/:\d+$/, "");
  }
  return normalized.split(/[/?#]/)[0] ?? normalized;
}

export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(getDomain(url))}`;
}

const BRAND_TILES: { match: string[]; bg: string; fg: string; initial: string }[] = [
  { match: ["facebook"], bg: "#1877F2", fg: "#ffffff", initial: "f" },
  { match: ["instagram"], bg: "#d62976", fg: "#ffffff", initial: "ig" },
  { match: ["gmail"], bg: "#ffffff", fg: "#EA4335", initial: "m" },
  { match: ["youtube"], bg: "#FF0000", fg: "#ffffff", initial: "yt" },
  { match: ["google", "gdrive", "docs.google"], bg: "#ffffff", fg: "#4285F4", initial: "g" },
  { match: ["twitter", "x.com"], bg: "#000000", fg: "#ffffff", initial: "x" },
  { match: ["tiktok"], bg: "#000000", fg: "#ffffff", initial: "tt" },
  { match: ["github"], bg: "#181717", fg: "#ffffff", initial: "gh" },
  { match: ["gitlab"], bg: "#FC6D26", fg: "#ffffff", initial: "gl" },
  { match: ["linkedin"], bg: "#0A66C2", fg: "#ffffff", initial: "in" },
  { match: ["reddit"], bg: "#FF4500", fg: "#ffffff", initial: "r" },
  { match: ["whatsapp"], bg: "#25D366", fg: "#075E54", initial: "wa" },
  { match: ["telegram"], bg: "#229ED9", fg: "#ffffff", initial: "t" },
  { match: ["discord"], bg: "#5865F2", fg: "#ffffff", initial: "d" },
  { match: ["slack"], bg: "#4A154B", fg: "#ffffff", initial: "s" },
  { match: ["netflix"], bg: "#E50914", fg: "#ffffff", initial: "n" },
  { match: ["spotify"], bg: "#1DB954", fg: "#000000", initial: "s" },
  { match: ["amazon", "prime"], bg: "#FF9900", fg: "#131A22", initial: "a" },
  { match: ["microsoft", "outlook", "office", "onedrive", "azure", "windows"], bg: "#0078D4", fg: "#ffffff", initial: "ms" },
  { match: ["paypal"], bg: "#003087", fg: "#ffffff", initial: "p" },
  { match: ["stripe"], bg: "#635BFF", fg: "#ffffff", initial: "s" },
  { match: ["binance"], bg: "#F3BA2F", fg: "#1E2026", initial: "b" },
  { match: ["coinbase"], bg: "#0052FF", fg: "#ffffff", initial: "c" },
  { match: ["dropbox"], bg: "#0061FF", fg: "#ffffff", initial: "db" },
  { match: ["notion"], bg: "#000000", fg: "#ffffff", initial: "n" },
  { match: ["figma"], bg: "#ffffff", fg: "#F24E1E", initial: "f" },
  { match: ["canva"], bg: "#7D2AE8", fg: "#ffffff", initial: "c" },
  { match: ["steam"], bg: "#1B2838", fg: "#ffffff", initial: "s" },
  { match: ["roblox"], bg: "#000000", fg: "#ffffff", initial: "r" },
  { match: ["openai", "chatgpt"], bg: "#10a37f", fg: "#ffffff", initial: "ai" },
  { match: ["anthropic", "claude"], bg: "#d97757", fg: "#ffffff", initial: "c" },
  { match: ["adobe", "photoshop", "illustrator", "premiere", "after effects"], bg: "#DA1F26", fg: "#ffffff", initial: "a" },
  { match: ["vercel"], bg: "#000000", fg: "#ffffff", initial: "v" },
  { match: ["aws", "amazon web"], bg: "#FF9900", fg: "#232F3E", initial: "aws" },
  { match: ["cloudflare"], bg: "#F38020", fg: "#ffffff", initial: "cf" },
  { match: ["shopify"], bg: "#96BF48", fg: "#ffffff", initial: "s" },
  { match: ["uber"], bg: "#000000", fg: "#ffffff", initial: "u" },
  { match: ["grab"], bg: "#00B14F", fg: "#ffffff", initial: "g" },
  { match: ["airbnb"], bg: "#FF5A5F", fg: "#ffffff", initial: "a" },
  { match: ["bdo"], bg: "#002776", fg: "#ffffff", initial: "bdo" },
  { match: ["bpi"], bg: "#E4002B", fg: "#ffffff", initial: "bpi" },
  { match: ["unionbank"], bg: "#F8C300", fg: "#003D7A", initial: "ub" },
  { match: ["gcash", "g-cash"], bg: "#007DFF", fg: "#ffffff", initial: "g" },
  { match: ["maya"], bg: "#3DBBDB", fg: "#ffffff", initial: "m" },
  { match: ["shopee"], bg: "#EE4D2D", fg: "#ffffff", initial: "s" },
  { match: ["lazada"], bg: "#0F1568", fg: "#ffffff", initial: "l" },
  { match: ["epic", "fortnite"], bg: "#000000", fg: "#ffffff", initial: "epic" },
  { match: ["coursera"], bg: "#0056D2", fg: "#ffffff", initial: "c" },
  { match: ["udemy"], bg: "#A435F0", fg: "#ffffff", initial: "u" },
  { match: ["stack overflow"], bg: "#F48024", fg: "#ffffff", initial: "so" },
  { match: ["wifi", "wi-fi"], bg: "#2563eb", fg: "#ffffff", initial: "wifi" },
  { match: ["passport"], bg: "#0d9488", fg: "#ffffff", initial: "p" },
  { match: ["driver"], bg: "#7c3aed", fg: "#ffffff", initial: "d" },
];

const FALLBACK_BGS = ["#e2e8f0", "#fecdd3", "#bae6fd", "#a7f3d0", "#fde68a", "#ddd6fe"];

export function brandTileFor(match: string, label: string): { bg: string; fg: string; initial: string } {
  const hay = match.toLowerCase();
  for (const t of BRAND_TILES) {
    if (t.match.some((m) => hay.includes(m))) {
      return { bg: t.bg, fg: t.fg, initial: t.initial };
    }
  }
  let h = 0;
  for (const c of hay) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {
    bg: FALLBACK_BGS[h % FALLBACK_BGS.length]!,
    fg: "#0f172a",
    initial: (label[0] ?? "?").toUpperCase(),
  };
}

interface BrandTileProps {
  label: string;
  subtitle?: string;
  url?: string;
  match: string;
  imageUrl?: string;
}

export function BrandTile({ label, subtitle, url, match, imageUrl }: BrandTileProps) {
  const colors = useThemeColors();
  const [broken, setBroken] = useState(false);
  const theme = brandTileFor(match, label);
  const showFavicon = !!url && !broken;

  return (
    <View style={styles.inner}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.iconWrap, styles.previewImage]}
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
          {showFavicon ? (
            <Image
              source={{ uri: faviconUrl(url!) }}
              style={styles.icon}
              resizeMode="contain"
              onError={() => setBroken(true)}
            />
          ) : (
            <Text style={[styles.initial, { color: theme.fg }]}>{theme.initial}</Text>
          )}
        </View>
      )}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { alignItems: "center", justifyContent: "center", width: "100%" },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  icon: { width: 34, height: 34 },
  previewImage: { width: 60, height: 60, borderRadius: 14 },
  initial: { fontSize: 16, fontWeight: "800" },
  title: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 11, textAlign: "center", marginTop: 2 },
});
