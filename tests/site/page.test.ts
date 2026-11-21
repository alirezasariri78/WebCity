import { describe, expect, it } from 'vitest';
import { THEMES, themeDef } from '../../src/core/catalog';
import { buildSite, pageHTML, pageParts, searchIndex, siteCSS } from '../../src/site';
import { house, parseHtml, part, town } from '../helpers';

function bakery() {
  const home = house('townhall', 3, 3, { name: 'Home' });
  const contact = house('post', 1, 3, { name: 'Contact', builtAt: 2 });
  return town({ name: 'Sunny <Bakery>', houses: [home, contact] });
}

describe('pages', () => {
  it('is a complete HTML document with menu, content and footer', () => {
    const t = bakery();
    const doc = parseHtml(pageHTML(t, t.houses[0], 'export'));
    expect(doc.title).toBe('Sunny <Bakery>');
    expect(doc.querySelector('nav .brand')!.textContent).toContain('Sunny <Bakery>');
    expect([...doc.querySelectorAll('nav a.link')].map((a) => a.getAttribute('href'))).toEqual(['index.html', 'contact.html']);
    expect(doc.querySelector('nav a.link.active')!.textContent).toBe('Home');
    expect(doc.querySelectorAll('main .sec')).toHaveLength(t.houses[0].items.length);
    expect(doc.querySelector('footer')!.textContent).toContain('Built with WebCity');
  });

  it('links a shared stylesheet when exported and inlines it in previews', () => {
    const t = bakery();
    expect(parseHtml(pageHTML(t, t.houses[0], 'export')).querySelector('link[href="style.css"]')).not.toBeNull();
    expect(parseHtml(pageHTML(t, t.houses[0], 'preview')).querySelector('style#tb-css')).not.toBeNull();
  });

  it('adds no scripts to exported pages unless something animates', () => {
    const t = bakery();
    expect(parseHtml(pageHTML(t, t.houses[0], 'export')).querySelector('script')).toBeNull();
    t.houses[0].items[0].style = { anim: 'fade' };
    expect(parseHtml(pageHTML(t, t.houses[0], 'export')).querySelector('script')!.textContent).toContain('IntersectionObserver');
  });

  it('adds the click-to-edit script only in the editor', () => {
    const t = bakery();
    expect(pageHTML(t, t.houses[0], 'edit')).toContain('tbSelect');
    expect(pageHTML(t, t.houses[0], 'preview')).not.toContain('tbSelect');
  });

  it('puts extra pages in a "More" menu so the menu stays on one line', () => {
    const t = bakery();
    for (let i = 0; i < 6; i++) t.houses.push(house('cottage', i, 6, { name: `Page ${i}`, builtAt: 10 + i }));
    const doc = parseHtml(pageHTML(t, t.houses.at(-1)!, 'export'));
    expect(doc.querySelectorAll('nav > .wrap > a.link')).toHaveLength(5);
    expect(doc.querySelectorAll('.more-menu a.link')).toHaveLength(3);
    expect(doc.querySelector('.more summary')!.classList).toContain('active');
  });

  it('uses the page title, description and language from the settings', () => {
    const t = bakery();
    t.site = { lang: 'fa', description: 'Fresh cakes', footer: 'Hello footer', hideBuiltWith: true };
    t.houses[1].seoTitle = 'Write to us';
    const contact = parseHtml(pageHTML(t, t.houses[1], 'export'));
    expect(contact.title).toBe('Write to us');
    expect(contact.documentElement.lang).toBe('fa');
    expect(contact.querySelector('meta[name=description]')!.getAttribute('content')).toBe('Fresh cakes');
    expect(contact.querySelector('footer')!.textContent).toBe('Hello footer');
  });

  it('applies page styles and menu options', () => {
    const t = bakery();
    t.houses[0].style = { bg: '#000000', navStyle: 'dark', sticky: '0', pattern: 'dots' };
    const p = pageParts(t, t.houses[0], 'export');
    expect(p.bodyStyle).toContain('background:#000000');
    expect(p.bodyClass).toContain('pat-dots');
    expect(p.body).toContain('class="nav nav-dark static"');
  });

  it('loads extra fonts chosen anywhere on the page', () => {
    const t = bakery();
    t.style = { font: 'Inter' };
    t.houses[0].items[0].style = { headingFont: 'Cinzel' };
    const fonts = pageParts(t, t.houses[0], 'export').fonts;
    expect(fonts).toContain('family=Inter');
    expect(fonts).toContain('family=Cinzel');
    expect(fonts.endsWith('&display=swap')).toBe(true);
  });

  it('shows a friendly message on an empty page', () => {
    const t = bakery();
    t.houses[0].items = [];
    expect(pageHTML(t, t.houses[0], 'export')).toContain('This page is empty for now.');
  });
});

describe('stylesheet', () => {
  it.each(THEMES.map((t) => t.id))('has the %s theme colours and the base styles', (id) => {
    const css = siteCSS(themeDef(id));
    expect(css).toContain(`--primary:${themeDef(id).site.primary}`);
    expect(css).toContain('.btn');
    expect(css).toContain('.fgrid');
  });

  it('adds site-wide overrides after the theme', () => {
    const t = bakery();
    t.style = { accent: '#ff00ff', bg: '#111111', bg2: '#222222', css: 'letter-spacing:1px' };
    const css = siteCSS(themeDef(t.theme), t);
    const root = css.slice(0, css.indexOf('}'));
    expect(root.indexOf('--primary:#ff00ff')).toBeGreaterThan(root.indexOf(`--primary:${themeDef(t.theme).site.primary}`));
    expect(css).toContain('body{background:linear-gradient(135deg,#111111,#222222)}');
    expect(css).toContain('body{letter-spacing:1px}');
  });
});

describe('export', () => {
  it('creates one file per page plus the stylesheet and a readme', () => {
    const t = bakery();
    t.houses[1].items.push(part('board'));
    const files = buildSite(t);
    expect(files.map((f) => f.path)).toEqual(['index.html', 'contact.html', 'style.css', 'README.txt']);
    expect(files.every((f) => f.content.length > 0)).toBe(true);
  });
});

describe('languages and direction', () => {
  it('writes Persian websites right to left with a Persian font and words', () => {
    const t = bakery();
    t.site = { lang: 'fa' };
    const html = pageHTML(t, t.houses[0], 'export');
    const doc = parseHtml(html);
    expect(doc.documentElement.getAttribute('lang')).toBe('fa');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(html).toContain('Vazirmatn');
    expect(doc.querySelector('footer')!.textContent).toContain('وب‌سیتی');
  });

  it('lets the player force a direction for the site, a page or one part', () => {
    const t = bakery();
    t.site = { lang: 'en', dir: 'rtl' };
    t.houses[0].style = { dir: 'ltr' };
    t.houses[0].items[0].style = { dir: 'rtl' };
    const doc = parseHtml(pageHTML(t, t.houses[0], 'export'));
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(doc.body.getAttribute('dir')).toBe('ltr');
    expect(doc.querySelector('main .sec')!.getAttribute('dir')).toBe('rtl');
  });

  it('places parts side by side', () => {
    const t = bakery();
    t.houses[0].items[0].style = { span: 'half', valign: 'center' };
    const section = parseHtml(pageHTML(t, t.houses[0], 'export')).querySelector('main .sec')!;
    expect(section.classList).toContain('span-half');
    expect(section.className).toMatch(/va-center/);
  });
});

describe('website extras', () => {
  it('adds unlocked extras to the page', () => {
    const t = bakery();
    t.city = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, kind: 'home' as const, x: i, y: 9, floors: 20, builtAt: 0 }));
    const html = pageHTML(t, t.houses[0], 'export');
    expect(html).toContain('Back to top');
    t.site = { features: { backToTop: false, readingBar: false, darkToggle: false, pageFade: false } };
    expect(pageHTML(t, t.houses[0], 'export')).not.toContain('Back to top');
  });
});

describe('wonder extras on the website', () => {
  const withWonders = (...kinds: string[]) => {
    const t = bakery();
    t.wonders = kinds.map((kind, i) => ({ id: `w${i}`, kind: kind as never, x: 9, y: i, startedAt: 0, done: true }));
    return t;
  };

  it('adds a search box with every page in its index', () => {
    const t = withWonders('library');
    const doc = parseHtml(pageHTML(t, t.houses[0], 'export'));
    expect(doc.querySelector('.search-btn')).not.toBeNull();
    expect(doc.querySelector('.search-box input')).not.toBeNull();
    const index = JSON.parse(searchIndex(t)) as { t: string; u: string }[];
    expect(index.map((p) => p.u)).toEqual(['index.html', 'contact.html']);
  });

  it('adds a floating contact button that goes to the contact page', () => {
    const t = withWonders('lighthouse');
    const fab = parseHtml(pageHTML(t, t.houses[0], 'export')).querySelector('a.contact-fab');
    expect(fab?.getAttribute('href')).toBe('contact.html');
  });

  it('makes the site installable with a manifest and an icon', () => {
    const t = withWonders('needle');
    const html = pageHTML(t, t.houses[0], 'export');
    expect(parseHtml(html).querySelector('link[rel="manifest"]')).not.toBeNull();
    const files = buildSite(t).map((f) => f.path);
    expect(files).toContain('manifest.webmanifest');
    expect(files).toContain('icon.svg');
    const manifest = JSON.parse(buildSite(t).find((f) => f.path === 'manifest.webmanifest')!.content as string);
    expect(manifest.name).toBe(t.name);
  });

  it('adds robots.txt, and a sitemap once the site address is known', () => {
    const t = withWonders('launch');
    expect(buildSite(t).map((f) => f.path)).toContain('robots.txt');
    expect(buildSite(t).map((f) => f.path)).not.toContain('sitemap.xml');
    t.site = { url: 'https://bakery.example/' };
    const sitemap = buildSite(t).find((f) => f.path === 'sitemap.xml')!.content as string;
    expect(sitemap).toContain('<loc>https://bakery.example/contact.html</loc>');
  });

  it('adds nothing from wonders that are still being built', () => {
    const t = withWonders('library', 'lighthouse');
    t.wonders.forEach((w) => (w.done = false));
    const html = pageHTML(t, t.houses[0], 'export');
    expect(html).not.toContain('search-box');
    expect(html).not.toContain('contact-fab');
  });
});
