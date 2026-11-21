import { describe, expect, it } from 'vitest';
import { FURNITURE } from '../../src/core/catalog';
import type { FormField } from '../../src/core/types';
import { renderSection, siteText } from '../../src/site';
import { RENDERED_KINDS } from '../../src/site/sections';
import { parseHtml, part } from '../helpers';

const ctx = { files: new Map([['home', 'index.html']]), text: siteText('en') };
const render = (...args: Parameters<typeof part>) => parseHtml(renderSection(part(...args), ctx));

describe('every piece of furniture', () => {
  it('has a renderer', () => {
    expect([...RENDERED_KINDS].sort()).toEqual(FURNITURE.map((f) => f.kind).sort());
  });

  it.each(FURNITURE.map((f) => f.kind))('%s renders with its default content', (kind) => {
    const item = part(kind);
    const html = renderSection(item, ctx);
    const doc = parseHtml(html);
    const wrapper = doc.querySelector(`[data-fid="${item.id}"]`);
    expect(wrapper).not.toBeNull();
    expect(wrapper!.classList.contains(`sec-${kind}`)).toBe(true);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('[object Object]');
  });

  it.each(FURNITURE.filter((f) => f.kind !== 'html').map((f) => f.kind))('%s escapes text typed by the player', (kind) => {
    const evil = '<img src=x onerror=alert(1)>';
    const props = Object.fromEntries(Object.keys(part(kind).props).map((key) => [key, evil]));
    const doc = parseHtml(renderSection(part(kind, props), ctx));
    expect(doc.querySelector('[onerror]')).toBeNull();
    expect(doc.querySelector('script')).toBeNull();
  });
});

describe('section styles', () => {
  it('applies a part style on its wrapper', () => {
    const doc = render('board', {}, { style: { bg: '#ff0000', align: 'center', anim: 'fade', anchor: 'About Us!' } });
    const wrapper = doc.querySelector<HTMLElement>('.sec')!;
    expect(wrapper.getAttribute('style')).toContain('background:#ff0000');
    expect(wrapper.classList).toContain('al-center');
    expect(wrapper.classList).toContain('reveal');
    expect(wrapper.id).toBe('about-us');
  });

  it('has no style attribute without a style', () => {
    expect(render('board').querySelector('.sec')!.hasAttribute('style')).toBe(false);
  });
});

describe('forms', () => {
  const fields: FormField[] = [
    { id: 'a', type: 'text', label: 'Name', required: true, half: true, placeholder: 'Jane' },
    { id: 'b', type: 'select', label: 'Size', options: 'S, M, L' },
    { id: 'c', type: 'radio', label: 'Colour', options: 'Red, Blue', required: true },
    { id: 'd', type: 'checkbox', label: 'News' },
    { id: 'e', type: 'textarea', label: 'Message', help: 'Be nice' },
  ];
  const doc = render('form', { fields: JSON.stringify(fields), email: 'me@shop.com', submit: 'Go' });

  it('connects every label to its input', () => {
    for (const label of doc.querySelectorAll('label[for]')) {
      expect(doc.getElementById(label.getAttribute('for')!), label.textContent!).not.toBeNull();
    }
  });

  it('builds the right input for each type', () => {
    expect(doc.querySelector('input[type=text][required][placeholder="Jane"]')).not.toBeNull();
    expect(doc.querySelectorAll('select option')).toHaveLength(4);
    expect(doc.querySelectorAll('input[type=radio]')).toHaveLength(2);
    expect(doc.querySelector('fieldset legend')!.textContent).toContain('Colour');
    expect(doc.querySelector('input[type=checkbox]')).not.toBeNull();
    expect(doc.querySelector('textarea + .help')!.textContent).toBe('Be nice');
  });

  it('marks required inputs and half-width inputs', () => {
    expect(doc.querySelectorAll('.req')).toHaveLength(2);
    expect(doc.querySelectorAll('.field.half')).toHaveLength(1);
  });

  it('sends to email by default, or to a form service when one is set', () => {
    expect(doc.querySelector('form')!.getAttribute('action')).toBe('mailto:me@shop.com');
    expect(doc.querySelector('form')!.getAttribute('enctype')).toBe('text/plain');
    const service = render('form', { endpoint: 'formspree.io/f/abc' }).querySelector('form')!;
    expect(service.getAttribute('action')).toBe('https://formspree.io/f/abc');
    expect(service.hasAttribute('enctype')).toBe(false);
  });

  it('keeps old mailboxes (without saved fields) working', () => {
    const old = render('mailbox', { fields: '' });
    expect(old.querySelectorAll('.field')).toHaveLength(3);
  });

  it('survives broken field data', () => {
    expect(render('form', { fields: '{oops' }).querySelector('form')).not.toBeNull();
  });
});

describe('content details', () => {
  it('links buttons to pages', () => {
    expect(
      render('bell', { link: 'page:home', variant: 'outline', size: 'lg' }).querySelector('a.btn.btn-outline.btn-lg')!.getAttribute('href'),
    ).toBe('index.html');
  });

  it('renders a row of buttons', () => {
    const rows = JSON.stringify([
      { label: 'A', link: '#a', variant: 'primary' },
      { label: 'B', link: '', variant: 'ghost' },
    ]);
    const links = render('buttons', { items: rows }).querySelectorAll('a.btn');
    expect([...links].map((a) => a.textContent)).toEqual(['A', 'B']);
  });

  it('highlights the middle pricing plan', () => {
    const doc = render('pricing', { items: 'A | $1 | x\nB | $2 | y, z\nC | $3 | w' });
    const plans = doc.querySelectorAll('.plan');
    expect(plans).toHaveLength(3);
    expect(plans[1].classList).toContain('featured');
    expect(plans[1].querySelectorAll('li')).toHaveLength(2);
  });

  it('shows a placeholder until a YouTube link is pasted', () => {
    expect(render('video', { url: '' }).querySelector('.empty-video')).not.toBeNull();
    expect(render('video', { url: 'https://youtu.be/dQw4w9WgXcQ' }).querySelector('iframe')!.getAttribute('src')).toContain('dQw4w9WgXcQ');
  });

  it('only shows social networks that were filled in', () => {
    const doc = render('social', { instagram: 'instagram.com/me', facebook: '', whatsapp: '+1 555 0100' });
    const links = [...doc.querySelectorAll('.social-link')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['📸 Instagram', '💬 WhatsApp']);
    expect(links[1].getAttribute('href')).toBe('https://wa.me/15550100');
  });

  it('keeps custom HTML as written (expert feature)', () => {
    expect(render('html', { code: '<b id="mine">hi</b>' }).getElementById('mine')).not.toBeNull();
  });
});
