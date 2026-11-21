import type { FormField } from '../core/types';
import { esc, splitList } from './text';

export interface FormOptions {
  fields: FormField[];
  submitLabel: string;
  chooseLabel?: string;
  action: string;
  sendsEmail: boolean;
  idPrefix: string;
}

function renderField(field: FormField, id: string, chooseLabel: string): string {
  const name = esc(field.label || id);
  const required = field.required ? ' required' : '';
  const star = field.required ? ' <i class="req" aria-hidden="true">*</i>' : '';
  const label = `${esc(field.label)}${star}`;
  const help = field.help ? `<small class="help">${esc(field.help)}</small>` : '';
  const placeholder = field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : '';
  const cls = `field${field.half ? ' half' : ''}`;
  const choices = splitList(field.options);

  switch (field.type) {
    case 'textarea':
      return `<div class="${cls}"><label for="${id}">${label}</label><textarea id="${id}" name="${name}" rows="5"${placeholder}${required}></textarea>${help}</div>`;
    case 'select': {
      const options = choices.map((c) => `<option>${esc(c)}</option>`).join('');
      return `<div class="${cls}"><label for="${id}">${label}</label><select id="${id}" name="${name}"${required}><option value="">${esc(field.placeholder || chooseLabel)}</option>${options}</select>${help}</div>`;
    }
    case 'radio': {
      const radios = choices
        .map(
          (c, i) =>
            `<label class="choice"><input type="radio" name="${name}" value="${esc(c)}"${i === 0 ? required : ''}> <span>${esc(c)}</span></label>`,
        )
        .join('');
      return `<fieldset class="${cls} choices"><legend>${label}</legend>${radios}${help}</fieldset>`;
    }
    case 'checkbox':
      return `<div class="${cls}"><label class="choice"><input type="checkbox" name="${name}" value="yes"${required}> <span>${label}</span></label>${help}</div>`;
    default:
      return `<div class="${cls}"><label for="${id}">${label}</label><input id="${id}" type="${esc(field.type)}" name="${name}"${placeholder}${required}>${help}</div>`;
  }
}

export function renderForm({ fields, submitLabel, chooseLabel = 'Choose…', action, sendsEmail, idPrefix }: FormOptions): string {
  const inputs = fields.map((field, i) => renderField(field, `${idPrefix}-${i}`, chooseLabel)).join('');
  const encoding = sendsEmail ? ' enctype="text/plain"' : '';
  return `<form action="${esc(action)}" method="post"${encoding}><div class="fgrid">${inputs}</div><button class="btn btn-primary btn-md" type="submit">${esc(submitLabel || 'Send')}</button></form>`;
}
