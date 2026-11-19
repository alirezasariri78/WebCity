export interface Picture {
  label: string;
  emoji: string;
  from: string;
  to: string;
}

export const PICTURES: Record<string, Picture> = {
  mountain: { label: 'Mountains', emoji: '🏔️', from: '#89f7fe', to: '#66a6ff' },
  beach: { label: 'Beach', emoji: '🏖️', from: '#f6d365', to: '#fda085' },
  flower: { label: 'Flowers', emoji: '🌸', from: '#fbc2eb', to: '#a6c1ee' },
  city: { label: 'City', emoji: '🏙️', from: '#a18cd1', to: '#fbc2eb' },
  cake: { label: 'Cake', emoji: '🍰', from: '#ffecd2', to: '#fcb69f' },
  coffee: { label: 'Coffee', emoji: '☕', from: '#d7b89c', to: '#8d6e63' },
  pizza: { label: 'Pizza', emoji: '🍕', from: '#f9d423', to: '#ff4e50' },
  gift: { label: 'Gift', emoji: '🎁', from: '#84fab0', to: '#8fd3f4' },
  shirt: { label: 'T-shirt', emoji: '👕', from: '#a1c4fd', to: '#c2e9fb' },
  book: { label: 'Books', emoji: '📚', from: '#fddb92', to: '#d1fdff' },
  laptop: { label: 'Laptop', emoji: '💻', from: '#cfd9df', to: '#e2ebf0' },
  guitar: { label: 'Music', emoji: '🎸', from: '#ff9a9e', to: '#fecfef' },
  cat: { label: 'Cat', emoji: '🐱', from: '#fff1eb', to: '#ace0f9' },
  plant: { label: 'Plant', emoji: '🪴', from: '#d4fc79', to: '#96e6a1' },
  rocket: { label: 'Rocket', emoji: '🚀', from: '#30cfd0', to: '#330867' },
  heart: { label: 'Heart', emoji: '💖', from: '#ff758c', to: '#ff7eb3' },
};

const PICTURE_PREFIX = 'pic:';
const resolved = new Map<string, string>();

function pictureSvg(p: Picture): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><circle cx="660" cy="90" r="140" fill="#fff" opacity=".18"/><circle cx="110" cy="460" r="190" fill="#fff" opacity=".14"/><text x="400" y="330" font-size="230" text-anchor="middle">${p.emoji}</text></svg>`;
}

export const isBuiltInPicture = (src: string) => src.startsWith(PICTURE_PREFIX);
export const pictureRef = (id: string) => `${PICTURE_PREFIX}${id}`;

/** Turns a built-in picture reference ("pic:cake") into an image URL. Other URLs pass through. */
export function resolveImage(src: string): string {
  if (!isBuiltInPicture(src)) return src;
  let url = resolved.get(src);
  if (!url) {
    const picture = PICTURES[src.slice(PICTURE_PREFIX.length)] ?? PICTURES.mountain;
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pictureSvg(picture))}`;
    resolved.set(src, url);
  }
  return url;
}
