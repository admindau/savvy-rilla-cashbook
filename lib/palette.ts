export const palette = [
  "#60a5fa","#34d399","#f472b6","#f59e0b","#a78bfa","#22d3ee","#fb7185",
  "#84cc16","#e879f9","#f97316","#2dd4bf","#f43f5e","#10b981"
];

export const paletteByIndex = (i: number) => palette[i % palette.length];

// deterministic color by string id
export function colorForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h*31 + id.charCodeAt(i)) >>> 0;
  return paletteByIndex(h);
}
