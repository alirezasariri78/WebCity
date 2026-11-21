import { DEFAULT_CONTACT_FIELDS, resolveImage } from '../core/catalog';
import { backgroundCSS, customCss, directionOf, styleClasses, styleVars } from '../core/design';
import type { FormField, Furniture, FurnitureKind } from '../core/types';
import { renderForm } from './forms';
import { resolveHref, youtubeId } from './links';
import type { SiteText } from './strings';
import { esc, lines, paragraphs, parseJSON, slugify, splitEmoji, splitList, splitPair } from './text';

export interface RenderContext {
  files: Map<string, string>;
  text: SiteText;
}

type Props = Record<string, string>;
type Renderer = (props: Props, ctx: RenderContext, item: Furniture) => string;

const href = (link: string | undefined, ctx: RenderContext) => esc(resolveHref(link, ctx.files));

const img = (src: string | undefined, alt = '') => (src ? `<img src="${esc(resolveImage(src))}" alt="${esc(alt)}" loading="lazy">` : '');

const heading = (text: string | undefined, tag = 'h2', cls = '') =>
  text ? `<${tag}${cls ? ` class="${cls}"` : ''}>${esc(text)}</${tag}>` : '';

const optional = (text: string | undefined, render: (t: string) => string) => (text ? render(text) : '');

export const button = (label: string | undefined, link: string | undefined, ctx: RenderContext, variant = 'primary', size = 'md') =>
  `<a class="btn btn-${esc(variant)} btn-${esc(size)}" href="${href(link, ctx)}">${esc(label || ctx.text.clickMe)}</a>`;

const section = (inner: string, cls = '') => `<section class="wrap${cls ? ` ${cls}` : ''}">${inner}</section>`;

const eachPair = (text: string | undefined, render: (left: string, right: string) => string) =>
  lines(text ?? '')
    .map((line) => render(...splitPair(line)))
    .join('');

function formSection(p: Props, item: Furniture, ctx: RenderContext): string {
  const fields = parseJSON<FormField[]>(p.fields || DEFAULT_CONTACT_FIELDS, []);
  const endpoint = p.endpoint?.trim();
  const form = renderForm({
    fields,
    submitLabel: p.submit || ctx.text.sendMessage,
    chooseLabel: ctx.text.choose,
    action: endpoint ? resolveHref(endpoint, new Map()) : `mailto:${p.email?.trim() ?? ''}`,
    sendsEmail: !endpoint,
    idPrefix: `f-${item.id}`,
  });
  return section(`<div class="card contact">${heading(p.title)}${optional(p.text, (t) => `<p class="muted">${esc(t)}</p>`)}${form}</div>`);
}

const SOCIAL_NETWORKS: [key: string, label: string, icon: string][] = [
  ['instagram', 'Instagram', '📸'],
  ['facebook', 'Facebook', '👍'],
  ['x', 'X', '✖️'],
  ['youtube', 'YouTube', '▶️'],
  ['tiktok', 'TikTok', '🎵'],
  ['whatsapp', 'WhatsApp', '💬'],
];

const RENDERERS: Record<FurnitureKind, Renderer> = {
  sign: (p) =>
    `<header class="hero align-${p.align === 'left' ? 'left' : 'center'}"><div class="wrap">${heading(p.title, 'h1')}${optional(p.subtitle, (t) => `<p class="lead">${esc(t)}</p>`)}</div></header>`,

  banner: (p, ctx) =>
    `<header class="banner"><div class="wrap">${heading(p.title, 'h1')}${optional(p.text, (t) => `<p class="lead">${esc(t)}</p>`)}${optional(p.label, (l) => button(l, p.link, ctx, 'light', 'lg'))}</div></header>`,

  board: (p) => section(`${heading(p.heading)}${paragraphs(p.text ?? '')}`, 'text'),

  painting: (p) =>
    section(`<figure class="picture">${img(p.src, p.caption)}${optional(p.caption, (c) => `<figcaption>${esc(c)}</figcaption>`)}</figure>`),

  bell: (p, ctx) => section(button(p.label, p.link, ctx, p.variant, p.size), 'btnrow'),

  buttons: (p, ctx) => {
    const rows = parseJSON<{ label: string; link: string; variant: string }[]>(p.items, []);
    return section(rows.map((r) => button(r.label, r.link, ctx, r.variant, p.size)).join(''), 'btnrow');
  },

  spacer: (p) => `<div class="spacer" style="height:${Number(p.size) || 60}px"></div>`,

  divider: () => '<div class="wrap"><hr class="divider"></div>',

  split: (p, ctx) =>
    section(
      `<div class="split${p.side === 'right' ? ' flip' : ''}">${img(p.src, p.heading)}<div class="split-text">${heading(p.heading)}${paragraphs(p.text ?? '')}${optional(p.label, (l) => `<div class="btnrow">${button(l, p.link, ctx)}</div>`)}</div></div>`,
    ),

  mailbox: (p, ctx, item) => formSection(p, item, ctx),
  form: (p, ctx, item) => formSection(p, item, ctx),

  newsletter: (p, ctx, item) =>
    section(
      `<div class="card newsletter"><div>${heading(p.title)}${optional(p.text, (t) => `<p class="muted">${esc(t)}</p>`)}</div><form action="mailto:${esc(p.email?.trim() ?? '')}" method="post" enctype="text/plain"><label class="sr" for="nl-${item.id}">Email</label><input id="nl-${item.id}" type="email" name="email" required placeholder="${esc(p.placeholder || 'you@mail.com')}"><button class="btn btn-primary btn-md" type="submit">${esc(p.button || ctx.text.signUp)}</button></form></div>`,
    ),

  photowall: (p) =>
    section(
      `${heading(p.title)}<div class="gallery">${splitList(p.images)
        .map((src) => `<figure>${img(src)}</figure>`)
        .join('')}</div>`,
    ),

  quote: (p) =>
    section(
      `<blockquote class="card quote"><p>“${esc(p.text ?? '')}”</p>${optional(p.author, (a) => `<cite>— ${esc(a)}</cite>`)}</blockquote>`,
    ),

  cards: (p) =>
    section(
      `${heading(p.title, 'h2', 'center')}<div class="cards">${eachPair(p.items, (title, desc) => {
        const [icon, text] = splitEmoji(title);
        return `<div class="card feature">${icon ? `<div class="icon">${icon}</div>` : ''}<h3>${esc(text)}</h3>${optional(desc, (d) => `<p class="muted">${esc(d)}</p>`)}</div>`;
      })}</div>`,
    ),

  product: (p, ctx) =>
    section(
      `<div class="card product">${img(p.src, p.name)}<div class="product-body">${heading(p.name, 'h3')}${optional(p.price, (v) => `<div class="price">${esc(v)}</div>`)}${optional(p.text, (t) => `<p class="muted">${esc(t)}</p>`)}${button(ctx.text.buyNow, p.link, ctx)}</div></div>`,
    ),

  hours: (p) =>
    section(
      `<div class="card hours">${heading(p.title)}<table>${eachPair(p.items, (day, time) => `<tr><td>${esc(day)}</td><td>${esc(time)}</td></tr>`)}</table></div>`,
    ),

  list: (p) =>
    section(
      `${heading(p.title)}<ul class="list">${lines(p.items ?? '')
        .map((l) => `<li>${esc(l)}</li>`)
        .join('')}</ul>`,
      'text',
    ),

  faq: (p) =>
    section(
      `${heading(p.title)}${eachPair(p.items, (q, a) => `<details class="card faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`)}`,
      'text',
    ),

  video: (p, ctx) => {
    const id = youtubeId(p.url ?? '');
    const player = id
      ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(p.title || 'Video')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
      : `<div class="video empty-video"><span>▶</span><p>${esc(ctx.text.noVideo)}</p></div>`;
    return section(`${heading(p.title, 'h2', 'center')}${player}`);
  },

  blog: (p) =>
    section(
      `<article class="card post">${img(p.src, p.title)}<div class="post-body">${optional(p.date, (d) => `<div class="date">${esc(d)}</div>`)}${heading(p.title)}${paragraphs(p.text ?? '')}</div></article>`,
    ),

  stats: (p) =>
    section(
      `<div class="stats">${eachPair(p.items, (n, label) => `<div class="stat"><b>${esc(n)}</b><span>${esc(label)}</span></div>`)}</div>`,
    ),

  team: (p) =>
    section(
      `${heading(p.title, 'h2', 'center')}<div class="cards">${eachPair(p.items, (who, role) => {
        const [icon, name] = splitEmoji(who);
        return `<div class="card person"><div class="avatar">${icon ?? esc(name.slice(0, 1))}</div><h3>${esc(name)}</h3>${optional(role, (r) => `<p class="muted">${esc(r)}</p>`)}</div>`;
      })}</div>`,
    ),

  pricing: (p, ctx) => {
    const plans = lines(p.items ?? '');
    const featured = plans.length > 1 ? Math.floor((plans.length - 1) / 2) : -1;
    const cards = plans
      .map((line, i) => {
        const [name, price = '', features = ''] = line.split('|').map((s) => s.trim());
        const isFeatured = i === featured;
        return `<div class="card plan${isFeatured ? ' featured' : ''}">${isFeatured ? `<div class="tag">${esc(ctx.text.popular)}</div>` : ''}<h3>${esc(name)}</h3><div class="price">${esc(price)}</div><ul class="list">${splitList(
          features,
        )
          .map((f) => `<li>${esc(f)}</li>`)
          .join('')}</ul>${button(ctx.text.pickPlan, '', ctx, isFeatured ? 'primary' : 'outline')}</div>`;
      })
      .join('');
    return section(`${heading(p.title, 'h2', 'center')}<div class="cards pricing">${cards}</div>`);
  },

  map: (p) =>
    section(
      `${heading(p.title, 'h2', 'center')}<div class="map card"><iframe title="Map" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(p.address ?? '')}&output=embed"></iframe></div>${optional(p.address, (a) => `<p class="center muted">📍 ${esc(a)}</p>`)}`,
    ),

  social: (p, ctx) => {
    const links = SOCIAL_NETWORKS.filter(([key]) => p[key]?.trim())
      .map(([key, label, icon]) => {
        const value = p[key].trim();
        const url = key === 'whatsapp' ? `https://wa.me/${value.replace(/\D/g, '')}` : resolveHref(value, ctx.files);
        return `<a class="social-link" href="${esc(url)}">${icon} ${label}</a>`;
      })
      .join('');
    return links ? section(`<div class="socials">${links}</div>`, 'center') : '';
  },

  timeline: (p) =>
    section(
      `${heading(p.title)}<ol class="timeline">${eachPair(p.items, (when, what) => `<li><span class="when">${esc(when)}</span><p>${esc(what)}</p></li>`)}</ol>`,
      'text',
    ),

  html: (p) => `<div class="custom-html">${p.code ?? ''}</div>`,
};

export function renderSection(item: Furniture, ctx: RenderContext): string {
  const inner = RENDERERS[item.kind](item.props, ctx, item);
  const style = item.style;
  const classes = ['sec', `sec-${item.kind}`, ...styleClasses(style)].join(' ');
  const css = [styleVars(style), backgroundCSS(style, resolveImage), customCss(style)].filter(Boolean).join(';');
  const anchor = style?.anchor ? ` id="${esc(slugify(style.anchor))}"` : '';
  const dir = directionOf(style);
  return `<div class="${classes}" data-fid="${esc(item.id)}"${anchor}${dir ? ` dir="${dir}"` : ''}${css ? ` style="${esc(css)}"` : ''}>${inner}</div>`;
}

export const RENDERED_KINDS = Object.keys(RENDERERS) as FurnitureKind[];
