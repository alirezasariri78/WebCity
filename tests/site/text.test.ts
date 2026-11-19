import { describe, expect, it } from 'vitest';
import { esc, lines, paragraphs, parseJSON, slugify, splitEmoji, splitList, splitPair } from '../../src/site/text';

describe('text helpers', () => {
  it('escapes everything that could become HTML', () => {
    expect(esc(`<script>alert("x") & 'y'</script>`)).toBe('&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;');
  });

  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(paragraphs('one\ntwo\n\nthree')).toBe('<p>one<br>two</p><p>three</p>');
    expect(paragraphs('   ')).toBe('');
  });

  it('cleans up lines and lists', () => {
    expect(lines(' a \n\n b ')).toEqual(['a', 'b']);
    expect(splitList(' a, ,b ,c')).toEqual(['a', 'b', 'c']);
    expect(splitList(undefined)).toEqual([]);
  });

  it('splits "left | right"', () => {
    expect(splitPair('Mon | 9-5')).toEqual(['Mon', '9-5']);
    expect(splitPair('just text')).toEqual(['just text', '']);
    expect(splitPair('a | b | c')).toEqual(['a', 'b | c']);
  });

  it('separates a leading emoji, including joined emoji', () => {
    expect(splitEmoji('⭐ Quality')).toEqual(['⭐', 'Quality']);
    expect(splitEmoji('👩‍🍳 Sara')).toEqual(['👩‍🍳', 'Sara']);
    expect(splitEmoji('Plain')).toEqual([null, 'Plain']);
  });

  it('makes safe file names', () => {
    expect(slugify('About Me!')).toBe('about-me');
    expect(slugify('Café & Bar')).toBe('cafe-bar');
    expect(slugify('!!!')).toBe('page');
  });

  it('falls back when JSON is broken', () => {
    expect(parseJSON('{bad', ['fallback'])).toEqual(['fallback']);
    expect(parseJSON(undefined, 1)).toBe(1);
    expect(parseJSON('[1,2]', [])).toEqual([1, 2]);
  });
});
