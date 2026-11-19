export interface Font {
  name: string;
  stack: string;
  query: string;
  feel: string;
}

export const FONTS: Font[] = [
  { name: 'Inter', stack: "'Inter', system-ui, sans-serif", query: 'Inter:wght@400;600;800', feel: 'Clean' },
  { name: 'Poppins', stack: "'Poppins', system-ui, sans-serif", query: 'Poppins:wght@400;600;800', feel: 'Friendly' },
  { name: 'Nunito', stack: "'Nunito', system-ui, sans-serif", query: 'Nunito:wght@400;700;800', feel: 'Soft' },
  { name: 'Montserrat', stack: "'Montserrat', system-ui, sans-serif", query: 'Montserrat:wght@400;600;800', feel: 'Modern' },
  { name: 'Fredoka', stack: "'Fredoka', system-ui, sans-serif", query: 'Fredoka:wght@400;600;700', feel: 'Playful' },
  { name: 'Space Grotesk', stack: "'Space Grotesk', system-ui, sans-serif", query: 'Space+Grotesk:wght@400;600;700', feel: 'Techy' },
  { name: 'Playfair Display', stack: "'Playfair Display', Georgia, serif", query: 'Playfair+Display:wght@400;600;800', feel: 'Elegant' },
  { name: 'Lora', stack: "'Lora', Georgia, serif", query: 'Lora:wght@400;600;700', feel: 'Bookish' },
  { name: 'Merriweather', stack: "'Merriweather', Georgia, serif", query: 'Merriweather:wght@400;700;900', feel: 'Classic' },
  { name: 'Cinzel', stack: "'Cinzel', Georgia, serif", query: 'Cinzel:wght@400;600;800', feel: 'Royal' },
  { name: 'Pacifico', stack: "'Pacifico', cursive", query: 'Pacifico', feel: 'Beachy' },
  { name: 'Caveat', stack: "'Caveat', cursive", query: 'Caveat:wght@400;700', feel: 'Handwritten' },
  { name: 'Baloo 2', stack: "'Baloo 2', system-ui, sans-serif", query: 'Baloo+2:wght@400;600;800', feel: 'Bubbly' },
  { name: 'Orbitron', stack: "'Orbitron', system-ui, sans-serif", query: 'Orbitron:wght@400;700;900', feel: 'Sci-fi' },
  { name: 'Roboto Slab', stack: "'Roboto Slab', Georgia, serif", query: 'Roboto+Slab:wght@400;600;800', feel: 'Sturdy' },
  { name: 'Source Code Pro', stack: "'Source Code Pro', monospace", query: 'Source+Code+Pro:wght@400;700', feel: 'Code' },
];

const fontsByName = new Map(FONTS.map((f) => [f.name, f]));
export const fontByName = (name?: string) => (name ? fontsByName.get(name) : undefined);

export const SWATCHES = [
  '#ffffff',
  '#f5f5f7',
  '#1f2937',
  '#000000',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#a16207',
  '#78716c',
];
