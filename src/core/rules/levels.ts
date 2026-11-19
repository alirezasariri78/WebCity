import { DECOR, FURNITURE, HOUSES, THEMES, UPGRADE_LEVEL, landSize } from '../catalog';
import { GROUPS } from '../design';

/** Total XP needed to reach a level: L2 = 60, L3 = 160, L4 = 300… */
export const xpForLevel = (level: number) => 20 * (level - 1) * (level + 1);

/** Inverse of `xpForLevel`. */
export const levelFromXp = (xp: number) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 20 + 1) + 1e-9));

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const from = xpForLevel(level);
  const need = xpForLevel(level + 1) - from;
  const into = xp - from;
  return { level, into, need, pct: into / need };
}

/** Human-readable list of everything that becomes available at `level`. */
export function unlocksAt(level: number): string[] {
  const at = <T extends { level: number }>(list: T[]) => list.filter((item) => item.level === level);
  return [
    ...at(HOUSES).map((h) => `${h.emoji} ${h.name} (${h.web})`),
    ...at(FURNITURE).map((f) => `${f.emoji} ${f.name} (${f.web})`),
    ...at(DECOR).map((d) => `${d.emoji} ${d.name}`),
    ...at(THEMES).map((t) => `${t.emoji} ${t.name} town style`),
    ...at(GROUPS).map((g) => `${g.emoji} Design tool: ${g.tool} (${g.name})`),
    ...(level === UPGRADE_LEVEL ? ['⬆️ House upgrades: bigger houses with more room!'] : []),
    ...(landSize(level) > landSize(level - 1) ? ['🗺️ Your land grows bigger!'] : []),
  ];
}
