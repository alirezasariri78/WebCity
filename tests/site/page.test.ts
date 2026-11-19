import { describe, expect, it } from 'vitest';
import { THEMES, themeDef } from '../../src/core/catalog';
import { buildSite, pageHTML, pageParts, siteCSS } from '../../src/site';
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
    expect(doc.querySelector('footer')!.textContent).toContain('Built with Town Builder');
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
