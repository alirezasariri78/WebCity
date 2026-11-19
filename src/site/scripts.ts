/** Fades sections in as visitors scroll. Included only when a page uses motion. */
export const REVEAL_SCRIPT = `document.documentElement.classList.add('js');
function tbReveal(){var els=document.querySelectorAll('.reveal:not(.in)');if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
els.forEach(function(e){io.observe(e)})}
document.addEventListener('DOMContentLoaded',tbReveal);`;

/** Magic Window: page links switch pages inside the game, outside links open a new tab. */
export const PREVIEW_SCRIPT = `${REVEAL_SCRIPT}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';
if(/\\.html$/.test(h)){e.preventDefault();parent.postMessage({tbNav:h},'*')}
else if(h==='#'){e.preventDefault();parent.postMessage({tbEmptyLink:true},'*')}
else if(h.charAt(0)!=='#'){a.target='_blank'}});
document.addEventListener('submit',function(e){e.preventDefault();parent.postMessage({tbForm:true},'*')});`;

/** Live editor: clicking selects a part, and the page updates in place without reloading. */
export const EDIT_SCRIPT = `document.documentElement.classList.add('js');
var tbSel=null;
function tbShowAll(){document.querySelectorAll('.reveal').forEach(function(x){x.classList.add('in')})}
function tbMark(scroll){document.querySelectorAll('.tb-sel').forEach(function(e){e.classList.remove('tb-sel')});if(!tbSel)return;
var el=document.querySelector('[data-fid="'+tbSel+'"]');if(el){el.classList.add('tb-sel');if(scroll)el.scrollIntoView({behavior:'smooth',block:'center'})}}
document.addEventListener('click',function(e){e.preventDefault();var s=e.target.closest&&e.target.closest('[data-fid]');parent.postMessage({tbSelect:s?s.getAttribute('data-fid'):null},'*')},true);
document.addEventListener('submit',function(e){e.preventDefault()},true);
addEventListener('scroll',function(){parent.postMessage({tbScroll:scrollY},'*')},{passive:true});
addEventListener('message',function(e){var d=e.data||{};
if(d.tbUpdate){document.getElementById('tb-css').textContent=d.css;var f=document.getElementById('tb-fonts');if(f.getAttribute('href')!==d.fonts)f.setAttribute('href',d.fonts);
document.body.className=d.bodyClass;document.body.setAttribute('style',d.bodyStyle);document.body.innerHTML=d.body;tbShowAll()}
if('tbSel' in d){tbSel=d.tbSel;tbMark(d.scroll)}else if(d.tbUpdate){tbMark(false)}});
document.addEventListener('DOMContentLoaded',function(){tbShowAll();tbMark(false)});`;

export const EDIT_CSS = `[data-fid]{cursor:pointer;transition:outline-color .15s}
[data-fid]:hover{outline:2px dashed rgba(124,92,255,.7);outline-offset:-2px}
[data-fid].tb-sel{outline:3px solid #7c5cff;outline-offset:-3px;box-shadow:inset 0 0 0 9999px rgba(124,92,255,.04)}`;
