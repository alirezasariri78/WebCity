import { describe, expect, it } from 'vitest';
import {
  CONTROLS,
  GROUPS,
  backgroundCSS,
  contrastText,
  customCss,
  fontByName,
  fontsUsed,
  isStyled,
  sanitizeCss,
  styleClasses,
  styleVars,
} from '../../src/core/design';

const passThrough = (src: string) => src;

describe('styleVars', () => {
  it('returns nothing for no style', () => {
    expect(styleVars(undefined)).toBe('');
    expect(styleVars({})).toBe('');
  });

  it('turns colours into CSS variables with readable button text', () => {
    const css = styleVars({ accent: '#ffffff', text: '#123456' });
    expect(css).toContain('--primary:#ffffff');
    expect(css).toContain('--primary-text:#111111');
    expect(css).toContain('--text:#123456');
    expect(css).toContain('--muted:');
  });

  it('turns a 40px button radius into a pill', () => {
    expect(styleVars({ btnRadius: '40' })).toContain('--btn-radius:999px');
    expect(styleVars({ btnRadius: '8' })).toContain('--btn-radius:8px');
  });

  it('keeps a zero radius (zero is a real value, not "unset")', () => {
    expect(styleVars({ radius: '0' })).toContain('--radius:0px');
  });

  it('maps fonts to full font stacks', () => {
    expect(styleVars({ headingFont: 'Playfair Display' })).toContain("--heading:'Playfair Display'");
  });

  it('ignores unknown fonts', () => {
    expect(styleVars({ font: 'Comic Neue Ultra' })).toBe('');
  });

  it('cannot break out of the style attribute', () => {
    const css = styleVars({ accent: 'red;}</style><script>alert(1)</script>' });
    expect(css).not.toMatch(/[<>{}"]/);
    expect(css.split(';').filter((d) => d.startsWith('--primary:'))).toHaveLength(1);
  });
});

describe('backgroundCSS', () => {
  it('uses a plain colour, or a gradient when two colours are set', () => {
    expect(backgroundCSS({ bg: '#ff0000' }, passThrough)).toBe('background:#ff0000');
    expect(backgroundCSS({ bg: '#ff0000', bg2: '#0000ff' }, passThrough)).toBe('background:linear-gradient(135deg,#ff0000,#0000ff)');
  });

  it('darkens background pictures by the chosen amount', () => {
    const css = backgroundCSS({ bgImage: 'photo.jpg', overlay: '60' }, passThrough);
    expect(css).toContain('rgba(0,0,0,0.6)');
    expect(css).toContain('url("photo.jpg") center/cover');
  });

  it('escapes quotes inside picture URLs', () => {
    expect(backgroundCSS({ bgImage: 'a"b.jpg' }, passThrough)).toContain('a%22b.jpg');
  });

  it('is empty without a background', () => {
    expect(backgroundCSS({ text: '#000' }, passThrough)).toBe('');
  });
});

describe('style helpers', () => {
  it('chooses dark text on light colours and light text on dark colours', () => {
    expect(contrastText('#ffffff')).toBe('#111111');
    expect(contrastText('#000000')).toBe('#ffffff');
    expect(contrastText('#fff')).toBe('#ffffff');
  });

  it('builds classes for alignment, patterns, inputs and motion', () => {
    expect(styleClasses({ align: 'left', pattern: 'dots', inputs: 'line', anim: 'up', hideMobile: '1', bgImage: 'x' })).toEqual([
      'al-left',
      'pat-dots',
      'in-line',
      'reveal',
      'rv-up',
      'hide-m',
      'on-image',
    ]);
    expect(styleClasses({ pattern: 'none', anim: 'none' })).toEqual([]);
  });

  it('knows when something has a style', () => {
    expect(isStyled(undefined)).toBe(false);
    expect(isStyled({ bg: '' })).toBe(false);
    expect(isStyled({ radius: '0' })).toBe(true);
  });

  it('lists only known fonts', () => {
    expect(fontsUsed({ font: 'Inter', headingFont: 'Nope' })).toEqual(['Inter']);
    expect(fontByName(undefined)).toBeUndefined();
  });

  it('strips dangerous characters from custom CSS', () => {
    expect(customCss({ css: 'color:red}</style>' })).toBe('color:red/style');
    expect(sanitizeCss('a;b{c}<d>"e')).toBe('abcde');
  });
});

describe('design controls', () => {
  it('belong to a known group', () => {
    const ids = new Set(GROUPS.map((g) => g.id));
    for (const c of CONTROLS) expect(ids.has(c.group), c.key).toBe(true);
  });

  it('have one control per style key', () => {
    const keys = CONTROLS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('give range controls sensible limits', () => {
    for (const c of CONTROLS.filter((x) => x.type === 'range')) {
      expect(c.min, c.key).toBeDefined();
      expect(c.max!, c.key).toBeGreaterThan(c.min!);
      expect(c.step!, c.key).toBeGreaterThan(0);
    }
  });

  it('give segment controls at least two options', () => {
    for (const c of CONTROLS.filter((x) => x.type === 'segment')) expect(c.options!.length, c.key).toBeGreaterThanOrEqual(2);
  });
});
