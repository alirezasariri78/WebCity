import { countFormFields, isForm } from '../../core/rules';
import type { Furniture } from '../../core/types';
import { parseJSON } from '../../site';
import { t } from '../../i18n';

const MAX_SUMMARY = 48;

export function summary(item: Furniture): string {
  const p = item.props;
  if (item.kind === 'photowall') return t('{n} photos', { n: (p.images || '').split(',').filter(Boolean).length });
  if (item.kind === 'divider') return '— — —';
  if (item.kind === 'spacer') return t('{n}px of space', { n: p.size });
  if (isForm(item)) return `${t('{n} inputs', { n: countFormFields(p.fields) })} · ${p.title ?? ''}`;
  if (item.kind === 'buttons')
    return parseJSON<{ label: string }[]>(p.items, [])
      .map((r) => r.label)
      .join(' · ');
  if (item.kind === 'html') return t('Custom code');
  const text = p.title || p.heading || p.name || p.label || p.text || p.caption || '';
  return text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY - 2)}…` : text;
}
