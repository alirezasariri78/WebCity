import type { House } from '../../core/types';
import { state } from '../../game/store';
import { pageHTML, pageParts } from '../../site';

const DESKTOP_WIDTH = 1200;
const PHONE_WIDTH = 390;
const UPDATE_DELAY_MS = 60;

/**
 * The real page inside the editor. The first load uses `srcdoc`; after that, changes are
 * sent with postMessage so the page updates in place (no flicker, scroll kept).
 */
export class LivePage {
  private ready = false;
  private scrollY = 0;
  private houseId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private observer: ResizeObserver | null = null;
  private frame: HTMLIFrameElement | null = null;
  private box: HTMLElement | null = null;
  device: 'desktop' | 'phone' = 'desktop';

  constructor(
    private readonly onSelect: (id: string | null) => void,
    private readonly onText: (id: string, before: string, after: string) => void,
  ) {
    addEventListener('message', (e) => this.onMessage(e));
  }

  attach(box: HTMLElement, house: House, selectedId: string | null) {
    this.box = box;
    this.frame = box.querySelector('iframe');
    if (this.houseId !== house.id) this.scrollY = 0;
    this.houseId = house.id;
    this.ready = false;
    this.resize();
    const restore = `<script>document.documentElement.style.scrollBehavior='auto';scrollTo(0,${Math.round(this.scrollY)});tbSel=${JSON.stringify(selectedId)};tbMark(false)</script></body>`;
    this.frame!.srcdoc = pageHTML(state.town, house, 'edit').replace('</body>', restore);
    this.frame!.onload = () => (this.ready = true);
    this.observer?.disconnect();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(box);
  }

  detach() {
    this.observer?.disconnect();
    this.observer = null;
    this.frame = null;
    this.box = null;
  }

  resize() {
    if (!this.box || !this.frame) return;
    const phone = this.device === 'phone';
    const virtualWidth = phone ? PHONE_WIDTH : DESKTOP_WIDTH;
    const scale = Math.min(1, (this.box.clientWidth - (phone ? 40 : 0)) / virtualWidth);
    this.frame.style.width = `${virtualWidth}px`;
    this.frame.style.height = `${(this.box.clientHeight - (phone ? 30 : 0)) / scale}px`;
    this.frame.style.transform = `scale(${scale})`;
    this.box.classList.toggle('phone', phone);
    (this.box.firstElementChild as HTMLElement).style.width = `${virtualWidth * scale}px`;
  }

  select(id: string | null, scroll: boolean) {
    this.post({ tbSel: id, scroll });
  }

  update(house: House, selectedId: string | null) {
    if (!this.frame) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.ready) return;
      const p = pageParts(state.town, house, 'edit');
      this.post({
        tbUpdate: true,
        css: p.css,
        fonts: p.fonts,
        bodyClass: p.bodyClass,
        bodyStyle: p.bodyStyle,
        body: p.body,
        tbSel: selectedId,
        scroll: false,
      });
    }, UPDATE_DELAY_MS);
  }

  private post(message: Record<string, unknown>) {
    if (this.ready) this.frame?.contentWindow?.postMessage(message, '*');
  }

  private onMessage(e: MessageEvent) {
    if (!this.frame || e.source !== this.frame.contentWindow) return;
    const data = (e.data ?? {}) as { tbScroll?: number; tbSelect?: string | null; tbText?: { id: string; before: string; after: string } };
    if (typeof data.tbScroll === 'number') this.scrollY = data.tbScroll;
    if (data.tbText) this.onText(data.tbText.id, data.tbText.before, data.tbText.after);
    if ('tbSelect' in data) this.onSelect(data.tbSelect ?? null);
  }
}
