import { describe, expect, it } from 'vitest';
import { HOME_FILE, fileNames, orderedHouses, resolveHref, youtubeId } from '../../src/site';
import { house, town } from '../helpers';

describe('page files', () => {
  it('makes the Town Hall the home page and orders the rest by age', () => {
    const t = town({
      houses: [
        house('cottage', 1, 1, { name: 'Later', builtAt: 20 }),
        house('townhall', 3, 3),
        house('post', 2, 2, { name: 'Earlier', builtAt: 10 }),
      ],
    });
    expect(orderedHouses(t).map((h) => h.kind)).toEqual(['townhall', 'post', 'cottage']);
    expect(fileNames(t).get(t.houses[1].id)).toBe(HOME_FILE);
  });

  it('gives every page a unique file name', () => {
    const t = town({
      houses: [
        house('townhall', 3, 3),
        ...[1, 2, 3].map((i) => house('cottage', i, 0, { name: 'About', builtAt: i })),
        house('cottage', 0, 5, { name: 'index', builtAt: 9 }),
      ],
    });
    const names = [...fileNames(t).values()];
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(['index.html', 'about.html', 'about-2.html', 'about-3.html', 'page.html']);
  });
});

describe('links', () => {
  const files = new Map([['h1', 'contact.html']]);

  it.each([
    ['', '#'],
    [undefined, '#'],
    ['page:h1', 'contact.html'],
    ['page:missing', '#'],
    ['#prices', '#prices'],
    ['me@mail.com', 'mailto:me@mail.com'],
    ['+1 (555) 123-456', 'tel:+1555123456'],
    ['instagram.com/me', 'https://instagram.com/me'],
    ['http://example.com', 'http://example.com'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
  ])('%s → %s', (input, expected) => {
    expect(resolveHref(input, files)).toBe(expected);
  });

  it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x'])('blocks unsafe link %s', (input) => {
    expect(resolveHref(input, files)).toBe('#');
  });

  it('reads YouTube ids from every common link shape', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
    }
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
  });
});
