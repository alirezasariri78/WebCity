import type { SiteFeature } from '../core/types';
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
};

const SCRIPT: Record<SiteFeature, string> = {
  backToTop: `(function(){var b=document.querySelector('.to-top');if(!b)return;addEventListener('scroll',function(){b.classList.toggle('show',scrollY>500)},{passive:true});b.addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})})})();`,
  readingBar: `(function(){var b=document.querySelector('.read-bar');if(!b)return;function u(){var h=document.documentElement.scrollHeight-innerHeight;b.style.transform='scaleX('+(h>0?scrollY/h:0)+')'}addEventListener('scroll',u,{passive:true});u()})();`,
  darkToggle: `(function(){var k='tb-dark',r=document.documentElement;try{if(localStorage.getItem(k)==='1')r.classList.add('dark')}catch(e){}var b=document.querySelector('.dark-btn');if(b)b.addEventListener('click',function(){var on=r.classList.toggle('dark');try{localStorage.setItem(k,on?'1':'0')}catch(e){}})})();`,
  pageFade: `document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a||a.target||!/\\.html$/.test(a.getAttribute('href')||''))return;e.preventDefault();document.body.classList.add('leaving');setTimeout(function(){location.href=a.href},180)});`,
};

export function featureCss(features: SiteFeature[]): string {
  return features.map((f) => CSS[f]).join('\n');
}

/** Script for the exported site. The editor and Magic Window skip page navigation tricks. */
export function featureScript(features: SiteFeature[], navigates: boolean): string {
  return features
    .filter((f) => navigates || f !== 'pageFade')
    .map((f) => SCRIPT[f])
    .join('\n');
}

export function featureNavButtons(features: SiteFeature[], text: SiteText): string {
  return features.includes('darkToggle')
    ? `<button class="dark-btn" type="button" title="${esc(text.darkMode)}" aria-label="${esc(text.darkMode)}">🌙</button>`
    : '';
}

export function featureBodyHtml(features: SiteFeature[], text: SiteText): string {
  return [
    features.includes('readingBar') ? '<div class="read-bar" aria-hidden="true"></div>' : '',
    features.includes('backToTop') ? `<button class="to-top" type="button" aria-label="${esc(text.backToTop)}">↑</button>` : '',
  ].join('');
}
