import type { FormField, FormFieldType } from '../../core/types';
import { sfx } from '../../game/audio';
import { uid } from '../../game/factory';
import { esc, parseJSON } from '../../site';

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: '🔤 Short text' },
  { value: 'email', label: '✉️ Email' },
  { value: 'tel', label: '📞 Phone' },
  { value: 'number', label: '🔢 Number' },
  { value: 'date', label: '📅 Date' },
  { value: 'url', label: '🔗 Web address' },
  { value: 'textarea', label: '📝 Long text' },
  { value: 'select', label: '🔽 Dropdown' },
  { value: 'radio', label: '🔘 Pick one' },
  { value: 'checkbox', label: '☑️ Tick box' },
];

const hasChoices = (type: FormFieldType) => type === 'select' || type === 'radio';
const hasPlaceholder = (type: FormFieldType) => !['checkbox', 'radio', 'date'].includes(type);

function fieldRow(field: FormField, index: number, count: number): string {
  const types = FIELD_TYPES.map((t) => `<option value="${t.value}"${t.value === field.type ? ' selected' : ''}>${t.label}</option>`).join(
    '',
  );
  const placeholder = hasPlaceholder(field.type)
    ? `<input class="input" data-key="placeholder" value="${esc(field.placeholder ?? '')}" placeholder="${field.type === 'select' ? 'First line, e.g. Choose…' : 'Grey hint inside the box'}">`
    : '<span></span>';
  const choices = hasChoices(field.type)
    ? `<input class="input wide" data-key="options" value="${esc(field.options ?? '')}" placeholder="Choices, split by commas: Red, Green, Blue">`
    : '';
  const toggle = (key: 'required' | 'half', label: string) =>
    `<label class="switch small"><input type="checkbox" data-flag="${key}"${field[key] ? ' checked' : ''}><i></i><span>${label}</span></label>`;

  return `<div class="ff" data-index="${index}">
    <div class="ff-top"><span class="ff-n">${index + 1}</span><input class="input" data-key="label" value="${esc(field.label)}" placeholder="Label (what to ask)">
      <button class="icon-btn" data-up ${index === 0 ? 'disabled' : ''}>▲</button><button class="icon-btn" data-down ${index === count - 1 ? 'disabled' : ''}>▼</button><button class="icon-btn danger" data-del>✕</button></div>
    <div class="ff-grid"><select class="input" data-key="type">${types}</select>${placeholder}${choices}
      <input class="input wide" data-key="help" value="${esc(field.help ?? '')}" placeholder="Small help text under it (optional)"></div>
    <div class="ff-flags">${toggle('required', 'Required')}${toggle('half', 'Half width')}</div>
  </div>`;
}

export function formBuilderHTML(key: string, json: string | undefined): string {
  const fields = parseJSON<FormField[]>(json, []);
  return `<div class="ffs" data-form="${key}">${fields.map((f, i) => fieldRow(f, i, fields.length)).join('')}<button class="btn small block" data-add-field>+ Add an input</button></div>`;
}

/** `save(json, rebuild)` stores the new list; `rebuild` asks to redraw the editor (structure changed). */
export function bindFormBuilder(wrap: HTMLElement, read: () => string | undefined, save: (json: string, rebuild: boolean) => void) {
  const fields = () => parseJSON<FormField[]>(read(), []);
  const commit = (list: FormField[], rebuild = false) => save(JSON.stringify(list), rebuild);

  wrap.querySelectorAll<HTMLElement>('.ff').forEach((row) => {
    const index = Number(row.dataset.index);

    row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach((input) => {
      const key = input.dataset.key as keyof FormField;
      const isType = key === 'type';
      input.addEventListener(isType ? 'change' : 'input', () => {
        const list = fields();
        Object.assign(list[index], { [key]: input.value });
        if (isType && hasChoices(input.value as FormFieldType) && !list[index].options) list[index].options = 'Option 1, Option 2';
        commit(list, isType);
      });
    });

    row.querySelectorAll<HTMLInputElement>('[data-flag]').forEach((input) =>
      input.addEventListener('change', () => {
        const list = fields();
        Object.assign(list[index], { [input.dataset.flag!]: input.checked });
        sfx('click');
        commit(list);
      }),
    );

    const swap = (other: number) => {
      const list = fields();
      if (other < 0 || other >= list.length) return;
      [list[index], list[other]] = [list[other], list[index]];
      sfx('click');
      commit(list, true);
    };
    row.querySelector('[data-up]')!.addEventListener('click', () => swap(index - 1));
    row.querySelector('[data-down]')!.addEventListener('click', () => swap(index + 1));
    row.querySelector('[data-del]')!.addEventListener('click', () => {
      const list = fields();
      list.splice(index, 1);
      sfx('delete');
      commit(list, true);
    });
  });

  wrap.querySelector('[data-add-field]')!.addEventListener('click', () => {
    sfx('pop');
    commit([...fields(), { id: uid(), type: 'text', label: 'New question', placeholder: '', required: false }], true);
  });
}
