import { PICTURES, pictureRef, resolveImage, type Field, type RowColumn } from '../../core/catalog';
import type { Furniture } from '../../core/types';
import { sfx } from '../../game/audio';
import { events } from '../../game/events';
import { state } from '../../game/store';
import { esc, orderedHouses, parseJSON } from '../../site';
import { shrinkImage } from '../common/download';
import { bindFormBuilder, formBuilderHTML } from './formBuilder';

/** Saves a new value. `rebuild` redraws the inspector when the field's layout changes. */
export type SaveValue = (key: string, value: string, rebuild?: boolean) => void;

type Row = Record<string, string>;

export function linkPicker(value: string, attrs: string): string {
  const isPage = value.startsWith('page:');
  const isCustom = !!value && !isPage;
  const pages = orderedHouses(state.town)
    .map((p) => `<option value="page:${p.id}"${value === `page:${p.id}` ? ' selected' : ''}>📄 ${esc(p.name)}</option>`)
    .join('');
  return `<div class="linkpick" ${attrs}>
    <select class="input" data-link-choice>
      <option value="">— Nowhere yet —</option>${pages}
      <option value="custom"${isCustom ? ' selected' : ''}>🌐 Web address, email, phone or #part…</option>
    </select>
    <input class="input" data-link-text placeholder="instagram.com/you · you@mail.com · #contact" value="${isCustom ? esc(value) : ''}" ${isCustom ? '' : 'hidden'}>
  </div>`;
}

export function bindLinkPicker(wrap: HTMLElement, onValue: (value: string) => void) {
  const choice = wrap.querySelector<HTMLSelectElement>('[data-link-choice]')!;
  const text = wrap.querySelector<HTMLInputElement>('[data-link-text]')!;
  choice.addEventListener('change', () => {
    const custom = choice.value === 'custom';
    text.hidden = !custom;
    if (custom) text.focus();
    onValue(custom ? text.value : choice.value);
  });
  text.addEventListener('input', () => onValue(text.value));
}

function picturePicker(key: string, mode: 'set' | 'add'): string {
  const pictures = Object.entries(PICTURES)
    .map(
      ([id, p]) =>
        `<button class="pic" data-pic="${pictureRef(id)}" data-key="${key}" data-mode="${mode}" title="${p.label}" style="background:linear-gradient(135deg,${p.from},${p.to})">${p.emoji}</button>`,
    )
    .join('');
  return `<div class="pic-grid">${pictures}</div>
    <label class="btn small upload">📁 Use my own picture<input type="file" accept="image/*" data-upload="${key}" data-mode="${mode}" hidden></label>`;
}

function rowsEditor(key: string, columns: RowColumn[], rows: Row[], addLabel = '+ Add'): string {
  const cell = (column: RowColumn, row: Row) => {
    const value = row[column.key] ?? '';
    if (column.type === 'link') return linkPicker(value, `data-col="${column.key}"`);
    if (column.type === 'select') {
      const options = column
        .options!.map((o) => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`)
        .join('');
      return `<select class="input" data-col="${column.key}">${options}</select>`;
    }
    return `<input class="input" data-col="${column.key}" value="${esc(value)}" placeholder="${esc(column.label)}">`;
  };
  const items = rows
    .map(
      (row, i) => `<div class="rowed" data-index="${i}">
        <div class="rowed-fields">${columns.map((c) => cell(c, row)).join('')}</div>
        <div class="rowed-tools"><button class="icon-btn" data-up ${i === 0 ? 'disabled' : ''}>▲</button><button class="icon-btn" data-down ${i === rows.length - 1 ? 'disabled' : ''}>▼</button><button class="icon-btn danger" data-del>✕</button></div>
      </div>`,
    )
    .join('');
  return `<div class="rows" data-rows="${key}">${items}<button class="btn small block" data-add-row>${esc(addLabel)}</button></div>`;
}

export function fieldHTML(field: Field, item: Furniture): string {
  const value = item.props[field.key] ?? '';
  const hint = field.hint ? `<small class="hint">${esc(field.hint)}</small>` : '';
  const labelled = (control: string) => `<label class="field"><span>${field.label}</span>${control}${hint}</label>`;
  const grouped = (control: string) => `<div class="field"><span>${field.label}</span>${control}${hint}</div>`;

  switch (field.type) {
    case 'text':
      return labelled(`<input class="input" data-field="${field.key}" value="${esc(value)}">`);
    case 'textarea':
      return labelled(`<textarea class="input" rows="4" data-field="${field.key}">${esc(value)}</textarea>`);
    case 'code':
      return labelled(`<textarea class="input code" rows="8" spellcheck="false" data-field="${field.key}">${esc(value)}</textarea>`);
    case 'select': {
      const options = field
        .options!.map((o) => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`)
        .join('');
      return labelled(`<select class="input" data-field="${field.key}">${options}</select>`);
    }
    case 'link':
      return grouped(linkPicker(value, `data-link-field="${field.key}"`));
    case 'image': {
      const current = value ? `<img src="${esc(resolveImage(value))}" alt="">` : '<div class="muted">No picture</div>';
      return grouped(`<div class="img-current">${current}</div>${picturePicker(field.key, 'set')}`);
    }
    case 'images': {
      const chips = value
        .split(',')
        .filter(Boolean)
        .map(
          (src, i) =>
            `<div class="img-chip"><img src="${esc(resolveImage(src))}" alt=""><button class="icon-btn danger" data-remove-image="${field.key}" data-index="${i}">✕</button></div>`,
        )
        .join('');
      return grouped(
        `<div class="img-list">${chips}</div><small class="hint">Click pictures below to add them:</small>${picturePicker(field.key, 'add')}`,
      );
    }
    case 'rows':
      return grouped(rowsEditor(field.key, field.columns!, parseJSON<Row[]>(value, []), field.addLabel));
    case 'formfields':
      return grouped(
        `<small class="hint">Each input gets a label. Mark the important ones as Required.</small>${formBuilderHTML(field.key, value)}`,
      );
  }
}

const appendTo = (list: string | undefined, value: string) => [...(list ?? '').split(',').filter(Boolean), value].join(',');

function bindRows(wrap: HTMLElement, read: () => Row[], save: (rows: Row[], rebuild?: boolean) => void) {
  wrap.querySelectorAll<HTMLElement>('.rowed').forEach((rowEl) => {
    const index = Number(rowEl.dataset.index);
    const setCell = (column: string, value: string) => {
      const rows = read();
      rows[index][column] = value;
      save(rows);
    };
    rowEl
      .querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[data-col], select[data-col]')
      .forEach((input) => input.addEventListener('input', () => setCell(input.dataset.col!, input.value)));
    rowEl
      .querySelectorAll<HTMLElement>('.linkpick[data-col]')
      .forEach((picker) => bindLinkPicker(picker, (v) => setCell(picker.dataset.col!, v)));

    const swap = (other: number) => {
      const rows = read();
      if (other < 0 || other >= rows.length) return;
      [rows[index], rows[other]] = [rows[other], rows[index]];
      sfx('click');
      save(rows, true);
    };
    rowEl.querySelector('[data-up]')!.addEventListener('click', () => swap(index - 1));
    rowEl.querySelector('[data-down]')!.addEventListener('click', () => swap(index + 1));
    rowEl.querySelector('[data-del]')!.addEventListener('click', () => {
      const rows = read();
      rows.splice(index, 1);
      sfx('delete');
      save(rows, true);
    });
  });
  wrap.querySelector('[data-add-row]')!.addEventListener('click', () => {
    sfx('pop');
    save([...read(), { label: 'New button', link: '', variant: 'outline' }], true);
  });
}

export function bindFields(el: HTMLElement, item: Furniture, save: SaveValue) {
  el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]').forEach((input) =>
    input.addEventListener('input', () => save(input.dataset.field!, input.value)),
  );
  el.querySelectorAll<HTMLElement>('[data-link-field]').forEach((picker) =>
    bindLinkPicker(picker, (v) => save(picker.dataset.linkField!, v)),
  );

  el.querySelectorAll<HTMLButtonElement>('[data-pic]').forEach((button) =>
    button.addEventListener('click', () => {
      sfx('pop');
      const key = button.dataset.key!;
      save(key, button.dataset.mode === 'set' ? button.dataset.pic! : appendTo(item.props[key], button.dataset.pic!), true);
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-remove-image]').forEach((button) =>
    button.addEventListener('click', () => {
      const key = button.dataset.removeImage!;
      const list = (item.props[key] || '').split(',').filter(Boolean);
      list.splice(Number(button.dataset.index), 1);
      sfx('delete');
      save(key, list.join(','), true);
    }),
  );
  el.querySelectorAll<HTMLInputElement>('[data-upload]').forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await shrinkImage(file, 1200);
        const key = input.dataset.upload!;
        save(key, input.dataset.mode === 'set' ? url : appendTo(item.props[key], url), true);
        sfx('pop');
      } catch {
        events.emit('toast', { text: 'Could not read that picture. Try a JPG or PNG.', kind: 'bad' });
      }
    }),
  );

  el.querySelectorAll<HTMLElement>('[data-rows]').forEach((wrap) => {
    const key = wrap.dataset.rows!;
    bindRows(
      wrap,
      () => parseJSON<Row[]>(item.props[key], []),
      (rows, rebuild) => save(key, JSON.stringify(rows), rebuild),
    );
  });
  el.querySelectorAll<HTMLElement>('[data-form]').forEach((wrap) => {
    const key = wrap.dataset.form!;
    bindFormBuilder(
      wrap,
      () => item.props[key],
      (json, rebuild) => save(key, json, rebuild),
    );
  });
}
