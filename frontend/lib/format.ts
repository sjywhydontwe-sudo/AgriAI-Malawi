export const ACRE = 0.404686;
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const money = (n: number) => "MWK " + fmt(n);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function fmtArea(ha: number, unit: "ha" | "acre") {
  return unit === "ha" ? `${+ha.toFixed(2)} ha` : `${+(ha / ACRE).toFixed(2)} acres`;
}

/** Minimal safe renderer for advisor text: **bold** and "- " bullets. */
export function richText(text: string): { type: "p" | "li"; parts: { b: boolean; t: string }[] }[] {
  return text.split("\n").filter(Boolean).map((line) => {
    const li = line.startsWith("- ");
    const body = li ? line.slice(2) : line;
    const parts = body.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) =>
      s.startsWith("**") && s.endsWith("**") ? { b: true, t: s.slice(2, -2) } : { b: false, t: s });
    return { type: li ? "li" : "p", parts };
  });
}
