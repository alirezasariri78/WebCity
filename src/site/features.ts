import type { SiteFeature, Town } from '../core/types';
import { fileNames, orderedHouses } from './links';
import type { SiteText } from './strings';
import { esc } from './text';

const CSS: Record<SiteFeature, string> = {
  backToTop: `.to-top{position:fixed;inset-block-end:22px;inset-inline-end:22px;width:48px;height:48px;border-radius:50%;border:0;background:var(--primary);color:var(--primary-text);font-size:1.3rem;cursor:pointer;box-shadow:0 10px 24px -8px var(--primary);opacity:0;transform:translateY(20px);transition:opacity .25s,transform .25s;z-index:30}
.to-top.show{opacity:1;transform:none}`,
  readingBar: `.read-bar{position:fixed;inset-inline:0;top:0;height:3px;background:var(--primary);transform-origin:0 50%;transform:scaleX(0);z-index:40}
[dir=rtl] .read-bar{transform-origin:100% 50%}`,
  darkToggle: `.dark-btn{border:0;background:none;font-size:1.15rem;cursor:pointer;padding:4px 6px;border-radius:8px}
html.dark{--bg:#0f1218;--surface:#1a1f29;--text:#eef1f7;--muted:#a7afc2;--border-c:#2a3140}
html.dark body{background:var(--bg)}`,
  pageFade: `@keyframes tb-in{from{opacity:0;transform:translateY(8px)}}
main{animation:tb-in .45s ease both}
body.leaving main{opacity:0;transition:opacity .2s}`,
  heroGlow: `main>.sec:first-child{position:relative;isolation:isolate;overflow:hidden}
main>.sec:first-child::before{content:'';position:absolute;inset:-50%;z-index:-1;background:conic-gradient(from 0deg,var(--primary),var(--accent),transparent,var(--primary));opacity:.22;filter:blur(70px);animation:tb-spin 20s linear infinite}
@keyframes tb-spin{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){main>.sec:first-child::before{animation:none}}`,
  search: `.search-btn{border:0;background:none;font-size:1.1rem;cursor:pointer;padding:4px 6px;border-radius:8px}
.search-box{position:fixed;inset:0;z-index:60;background:rgba(10,12,20,.55);display:none;align-items:flex-start;justify-content:center;padding:10vh 16px 16px}
.search-box.open{display:flex}
.search-panel{width:min(560px,100%);background:var(--surface);color:var(--text);border-radius:18px;padding:14px;box-shadow:0 30px 60px -20px rgba(0,0,0,.5)}
.search-panel input{width:100%;font:inherit;font-size:1.1rem;padding:12px 14px;border-radius:12px;border:2px solid color-mix(in srgb,var(--text) 15%,transparent);background:var(--bg);color:var(--text)}
.search-results{list-style:none;margin:10px 0 0;padding:0;max-height:50vh;overflow:auto}
.search-results a{display:block;padding:10px 12px;border-radius:10px;color:var(--text);text-decoration:none}
.search-results a:hover,.search-results a:focus{background:color-mix(in srgb,var(--primary) 12%,transparent)}
.search-results small{display:block;color:var(--muted)}`,
  contactFab: `.contact-fab{position:fixed;inset-block-end:22px;inset-inline-start:22px;z-index:30;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:var(--primary);color:var(--primary-text);font-weight:600;text-decoration:none;box-shadow:0 12px 28px -10px var(--primary);animation:tb-pop .5s .6s both}
@keyframes tb-pop{from{opacity:0;transform:scale(.6)}}`,
  lightbox: `main img{cursor:zoom-in}
.lightbox{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;animation:tb-fade .2s}
.lightbox img{max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
@keyframes tb-fade{from{opacity:0}}`,
  installable: '',
  seoPack: '',
};

const SCRIPT: Record<SiteFeature, string> = {
  backToTop: `(function(){var b=document.querySelector('.to-top');if(!b)return;addEventListener('scroll',function(){b.classList.toggle('show',scrollY>500)},{passive:true});b.addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})})})();`,
  readingBar: `(function(){var b=document.querySelector('.read-bar');if(!b)return;function u(){var h=document.documentElement.scrollHeight-innerHeight;b.style.transform='scaleX('+(h>0?scrollY/h:0)+')'}addEventListener('scroll',u,{passive:true});u()})();`,
  darkToggle: `(function(){var k='tb-dark',r=document.documentElement;try{if(localStorage.getItem(k)==='1')r.classList.add('dark')}catch(e){}var b=document.querySelector('.dark-btn');if(b)b.addEventListener('click',function(){var on=r.classList.toggle('dark');try{localStorage.setItem(k,on?'1':'0')}catch(e){}})})();`,
  pageFade: `document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a||a.target||!/\\.html$/.test(a.getAttribute('href')||''))return;e.preventDefault();document.body.classList.add('leaving');setTimeout(function(){location.href=a.href},180)});`,
  heroGlow: '',
  search: `(function(){var box=document.querySelector('.search-box'),btn=document.querySelector('.search-btn');if(!box||!btn||!window.TB_INDEX)return;var input=box.querySelector('input'),list=box.querySelector('.search-results');
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function run(){var q=input.value.trim().toLowerCase();if(!q){list.innerHTML='';return}var hits=TB_INDEX.filter(function(p){return(p.t+' '+p.x).toLowerCase().indexOf(q)>=0});
list.innerHTML=hits.length?hits.map(function(p){var i=p.x.toLowerCase().indexOf(q),s=i<0?p.x.slice(0,90):p.x.slice(Math.max(0,i-40),i+60);return'<li><a href="'+p.u+'"><b>'+esc(p.t)+'</b><small>'+esc(s)+'…</small></a></li>'}).join(''):'<li><small>'+esc(box.getAttribute('data-none'))+'</small></li>'}
btn.addEventListener('click',function(){box.classList.add('open');input.focus()});box.addEventListener('click',function(e){if(e.target===box)box.classList.remove('open')});
addEventListener('keydown',function(e){if(e.key==='Escape')box.classList.remove('open')});input.addEventListener('input',run)})();`,
  contactFab: '',
  lightbox: `document.addEventListener('click',function(e){var img=e.target.closest&&e.target.closest('main img');if(!img||img.closest('a'))return;var o=document.createElement('div');o.className='lightbox';o.innerHTML='<img alt="">';o.firstChild.src=img.currentSrc||img.src;o.addEventListener('click',function(){o.remove()});document.body.appendChild(o)});`,
  installable: '',
  seoPack: '',
};

export function featureCss(features: SiteFeature[]): string {
  return features
    .map((f) => CSS[f])
    .filter(Boolean)
    .join('\n');
}

/** Words from every page, so the search box works without a server. */
export function searchIndex(town: Town): string {
  const files = fileNames(town);
  const pages = orderedHouses(town).map((house) => {
    const words = house.items
      .flatMap((item) => Object.values(item.props))
      .filter((v) => v && !/^\s*[[{<]/.test(v) && !v.startsWith('pic:') && !v.startsWith('data:'))
      .join(' · ')
      .replace(/\s+/g, ' ')
      .slice(0, 1500);
    return { t: house.name, u: files.get(house.id), x: words };
  });
  return JSON.stringify(pages).replace(/</g, '\\u003c');
}

/** Script for the page. The editor and Magic Window skip page navigation tricks. */
export function featureScript(features: SiteFeature[], navigates: boolean, town?: Town): string {
  const index = features.includes('search') && town ? `window.TB_INDEX=${searchIndex(town)};` : '';
  return (
    index +
    features
      .filter((f) => navigates || f !== 'pageFade')
      .map((f) => SCRIPT[f])
      .filter(Boolean)
      .join('\n')
  );
}

export function featureNavButtons(features: SiteFeature[], text: SiteText): string {
  return [
    features.includes('search')
      ? `<button class="search-btn" type="button" title="${esc(text.search)}" aria-label="${esc(text.search)}">🔍</button>`
      : '',
    features.includes('darkToggle')
      ? `<button class="dark-btn" type="button" title="${esc(text.darkMode)}" aria-label="${esc(text.darkMode)}">🌙</button>`
      : '',
  ].join('');
}

/** Where the floating contact button goes: the contact page, or else the first email we can find. */
function contactHref(town: Town): string | null {
  const files = fileNames(town);
  const post = town.houses.find((h) => h.kind === 'post');
  if (post) return files.get(post.id) ?? null;
  const email = town.houses.flatMap((h) => h.items).find((i) => i.props.email?.includes('@'))?.props.email;
  return email ? `mailto:${email.trim()}` : null;
}

export function featureBodyHtml(features: SiteFeature[], text: SiteText, town?: Town): string {
  const contact = features.includes('contactFab') && town ? contactHref(town) : null;
  return [
    features.includes('readingBar') ? '<div class="read-bar" aria-hidden="true"></div>' : '',
    features.includes('backToTop') ? `<button class="to-top" type="button" aria-label="${esc(text.backToTop)}">↑</button>` : '',
    contact ? `<a class="contact-fab" href="${esc(contact)}">💬 ${esc(text.contact)}</a>` : '',
    features.includes('search')
      ? `<div class="search-box" role="dialog" aria-label="${esc(text.search)}" data-none="${esc(text.noResults)}"><div class="search-panel"><input type="search" placeholder="${esc(text.searchHint)}" aria-label="${esc(text.search)}"><ul class="search-results"></ul></div></div>`
      : '',
  ].join('');
}

export function featureHead(features: SiteFeature[], town: Town, themeColor: string): string {
  return [
    features.includes('installable')
      ? `<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="${esc(themeColor)}">`
      : '',
    features.includes('seoPack')
      ? `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(town.name)}"><meta name="twitter:card" content="summary"><meta name="robots" content="index,follow">`
      : '',
  ].join('');
}

const iconSvg = (logo: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${esc(color)}"/><text x="50%" y="54%" font-size="300" text-anchor="middle" dominant-baseline="middle">${esc(logo)}</text></svg>`;

/** Extra files in the download: an app manifest and icon, robots.txt and a sitemap. */
export function featureFiles(features: SiteFeature[], town: Town, themeColor: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  if (features.includes('installable')) {
    const manifest = {
      name: town.name,
      short_name: town.name.slice(0, 12),
      start_url: 'index.html',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: themeColor,
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    };
    files.push(
      { path: 'manifest.webmanifest', content: JSON.stringify(manifest, null, 2) },
      { path: 'icon.svg', content: iconSvg(town.logo, themeColor) },
    );
  }
  if (features.includes('seoPack')) {
    const address = town.site?.url?.trim().replace(/\/+$/, '');
    files.push({ path: 'robots.txt', content: `User-agent: *\nAllow: /\n${address ? `Sitemap: ${address}/sitemap.xml\n` : ''}` });
    if (address) {
      const names = fileNames(town);
      const urls = orderedHouses(town)
        .map((h) => `  <url><loc>${esc(`${address}/${names.get(h.id)}`)}</loc></url>`)
        .join('\n');
      files.push({
        path: 'sitemap.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    }
  }
  return files;
}
