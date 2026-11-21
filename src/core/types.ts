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
  | 'castle'
  | 'custom';

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
  | 'sticky'
  | 'span'
  | 'valign'
  | 'justify'
  | 'dir';

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

export type RoofShape = 'pyramid' | 'flat' | 'spire' | 'dome' | 'castle';

/** How a custom building looks. */
export interface BuildingLook {
  wall: string;
  roof: string;
  shape: RoofShape;
  emoji?: string;
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
  look?: BuildingLook;
  style?: StyleProps;
  seoTitle?: string;
  seoDesc?: string;
}

export type CityKind =
  'home' | 'shop' | 'farm' | 'school' | 'office' | 'hospital' | 'theater' | 'university' | 'factory' | 'stadium' | 'landmark' | 'custom';

/** A building that is part of the town but not a page: homes, offices, schools… They grow taller over time. */
export interface CityBuilding {
  id: string;
  kind: CityKind;
  x: number;
  y: number;
  floors: number;
  builtAt: number;
  name?: string;
  look?: BuildingLook;
}

export interface Decor {
  id: string;
  kind: DecorKind;
  x: number;
  y: number;
}

export type TextDirection = 'auto' | 'ltr' | 'rtl';

export type SiteFeature =
  'backToTop' | 'readingBar' | 'darkToggle' | 'pageFade' | 'search' | 'contactFab' | 'heroGlow' | 'lightbox' | 'installable' | 'seoPack';

export type Terrain = 'grass' | 'forest' | 'hill' | 'mountain' | 'water' | 'sand';

export type ResourceKind = 'wheat' | 'fish' | 'gold' | 'gems' | 'marble' | 'crystal';

export type TechId =
  | 'agriculture'
  | 'writing'
  | 'trade'
  | 'medicine'
  | 'philosophy'
  | 'engineering'
  | 'banking'
  | 'printing'
  | 'industry'
  | 'electricity'
  | 'computers'
  | 'internet';

export type WonderKind = 'gardens' | 'library' | 'lighthouse' | 'colosseum' | 'observatory' | 'needle' | 'launch';

/** The map around the town. Terrain comes from the seed, so only what the player changed is saved. */
export interface World {
  seed: number;
  size: number;
  /** Tiles inside the borders, as `y * size + x`. */
  owned: number[];
  /** Forest tiles that were cut down to make room. */
  cleared: number[];
  /** Ruins already explored. */
  ruins: number[];
  /** Culture saved up towards the next tile. */
  culture: number;
}

export interface Wonder {
  id: string;
  kind: WonderKind;
  x: number;
  y: number;
  startedAt: number;
  done: boolean;
}

export interface SiteSettings {
  description?: string;
  footer?: string;
  logoImage?: string;
  lang?: string;
  dir?: TextDirection;
  hideBuiltWith?: boolean;
  /** Where the site lives once it is online, for the sitemap. */
  url?: string;
  /** Extras unlocked as the city grows. `false` means the player switched it off. */
  features?: Partial<Record<SiteFeature, boolean>>;
}

export interface Town {
  name: string;
  logo: string;
  theme: ThemeId;
  houses: House[];
  decor: Decor[];
  city: CityBuilding[];
  world: World;
  wonders: Wonder[];
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
  cityBuilt: number;
  grown: number;
  tiles: number;
  techs: number;
  ruins: number;
  wonders: number;
  painted: number;
}

export interface Research {
  current: TechId | null;
  points: number;
  done: TechId[];
}

export interface ChallengeDay {
  day: string;
  /** Picked challenge ids with the stat value when the day started. */
  picks: { id: string; base: number }[];
  claimed: string[];
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
  research: Research;
  challenges?: ChallengeDay;
  /** Golden Age: everything produces more until this time. */
  goldenUntil?: number;
  won?: boolean;
}

export type Lang = 'en' | 'fa';

export interface Settings {
  muted: boolean;
  welcomed: boolean;
  lang: Lang;
  tourDone: boolean;
  /** Show every design tool instead of the basic ones. */
  allTools: boolean;
}

export interface SaveData {
  version: 1;
  town: Town;
  progress: Progress;
  settings: Settings;
}
