export type ThemeId = 'meadow' | 'beach' | 'sakura' | 'night' | 'autumn' | 'snow' | 'candy' | 'ocean' | 'royal' | 'space';

export type HouseKind =
  | 'townhall'
  | 'cottage'
  | 'post'
  | 'gallery'
  | 'shop'
  | 'cafe'
  | 'library'
  | 'tower'
  | 'news'
  | 'cinema'
  | 'guild'
  | 'bank'
  | 'maphouse'
  | 'castle';

export type FurnitureKind =
  | 'sign'
  | 'board'
  | 'painting'
  | 'bell'
  | 'divider'
  | 'mailbox'
  | 'photowall'
  | 'quote'
  | 'cards'
  | 'product'
  | 'hours'
  | 'list'
  | 'faq'
  | 'banner'
  | 'video'
  | 'blog'
  | 'stats'
  | 'team'
  | 'pricing'
  | 'map'
  | 'social'
  | 'timeline'
  | 'spacer'
  | 'buttons'
  | 'split'
  | 'form'
  | 'newsletter'
  | 'html';

export type DecorKind =
  | 'tree'
  | 'flowers'
  | 'bush'
  | 'pine'
  | 'rock'
  | 'mushroom'
  | 'lamp'
  | 'bench'
  | 'hedge'
  | 'fountain'
  | 'pond'
  | 'sakura'
  | 'windmill'
  | 'statue'
  | 'campfire'
  | 'balloon';

export type StyleKey =
  | 'bg'
  | 'bg2'
  | 'bgImage'
  | 'overlay'
  | 'pattern'
  | 'text'
  | 'accent'
  | 'surface'
  | 'radius'
  | 'btnRadius'
  | 'shadow'
  | 'border'
  | 'borderColor'
  | 'pad'
  | 'width'
  | 'align'
  | 'font'
  | 'headingFont'
  | 'size'
  | 'weight'
  | 'spacing'
  | 'inputs'
  | 'anim'
  | 'hideMobile'
  | 'anchor'
  | 'css'
  | 'navStyle'
  | 'sticky';

/** Looks for the whole site, one page, or one part. The most specific layer wins. */
export type StyleProps = Partial<Record<StyleKey, string>>;

export type FormFieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'url';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  half?: boolean;
  options?: string;
  help?: string;
}

export interface Furniture {
  id: string;
  kind: FurnitureKind;
  props: Record<string, string>;
  style?: StyleProps;
  edited?: boolean;
}

export interface House {
  id: string;
  kind: HouseKind;
  name: string;
  x: number;
  y: number;
  items: Furniture[];
  builtAt: number;
  level?: number;
  style?: StyleProps;
  seoTitle?: string;
  seoDesc?: string;
}

export interface Decor {
  id: string;
  kind: DecorKind;
  x: number;
  y: number;
}

export interface SiteSettings {
  description?: string;
  footer?: string;
  logoImage?: string;
  lang?: string;
  hideBuiltWith?: boolean;
}

export interface Town {
  name: string;
  logo: string;
  theme: ThemeId;
  houses: House[];
  decor: Decor[];
  style?: StyleProps;
  site?: SiteSettings;
}

export interface Stats {
  housesBuilt: number;
  furnitureAdded: number;
  edits: number;
  decorPlaced: number;
  exports: number;
  previews: number;
  visits: number;
  themesTried: number;
  coinsEarned: number;
  upgrades: number;
  collected: number;
  styled: number;
}

export interface Progress {
  xp: number;
  coins: number;
  questIndex: number;
  questBase: number;
  achievements: string[];
  streak: number;
  lastDay: string;
  lastSeen: number;
  stats: Stats;
  seenLevel: number;
  toolsUsed?: string[];
}

export interface Settings {
  muted: boolean;
  welcomed: boolean;
}

export interface SaveData {
  version: 1;
  town: Town;
  progress: Progress;
  settings: Settings;
}
