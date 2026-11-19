import { describe, expect, it } from 'vitest';
import { furnitureDef } from '../../src/core/catalog';
import { DEFAULT_TOWN_NAME, incomePerTick, rateTown, visitorsPerHour } from '../../src/core/rules';
import { house, part, town } from '../helpers';

function perfectTown() {
  const markEdited = <T extends { edited?: boolean }>(item: T) => ({ ...item, edited: true });
  const home = house('townhall', 3, 3);
  home.items = [part('sign', { title: 'Hi' }), part('painting'), part('painting')].map(markEdited);
  const post = house('post', 1, 3);
  post.items = [part('sign'), part('mailbox', { email: 'me@site.com' })].map(markEdited);
  const shop = house('cottage', 5, 3);
  shop.items = shop.items.map(markEdited);
  return town({ name: 'Bakery', houses: [home, post, shop] });
}

describe('website rating', () => {
  it('gives a brand new town a low score with helpful hints', () => {
    const r = rateTown(town());
    expect(r.score).toBeLessThan(40);
    expect(r.hints.length).toBeGreaterThan(2);
  });

  it('gives a complete town a perfect score and no hints', () => {
    const r = rateTown(perfectTown());
    expect(r.score).toBe(100);
    expect(r.stars).toBe(5);
    expect(r.hints).toEqual([]);
  });

  it('asks for a real email when the mailbox still has the example one', () => {
    const t = perfectTown();
    const mailbox = t.houses[1].items[1];
    mailbox.props.email = furnitureDef('mailbox').defaults.email;
    expect(rateTown(t).hints.join(' ')).toMatch(/Mailbox/);
  });

  it('names the house that is almost empty', () => {
    const t = perfectTown();
    t.houses[2].items = [];
    t.houses[2].name = 'Empty Shop';
    expect(rateTown(t).hints.join(' ')).toContain('"Empty Shop"');
  });

  it('wants a real town name', () => {
    expect(rateTown(perfectTown()).hints).toEqual([]);
    expect(rateTown({ ...perfectTown(), name: DEFAULT_TOWN_NAME }).score).toBe(90);
  });

  it('always keeps the score between 0 and 100', () => {
    for (const t of [town(), perfectTown(), town({ houses: [] })]) {
      const { score } = rateTown(t);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('visitors and income', () => {
  it('grows with a better score', () => {
    const t = town();
    expect(visitorsPerHour(t, 80)).toBeGreaterThan(visitorsPerHour(t, 20));
    expect(incomePerTick(t, 100)).toBeGreaterThan(incomePerTick(t, 0));
  });

  it('pays at least one coin', () => {
    expect(incomePerTick(town({ houses: [], decor: [] }), 0)).toBe(1);
  });

  it('pays more for upgraded houses', () => {
    const plain = town({ houses: [house('townhall', 3, 3), house('cottage', 1, 1)] });
    const upgraded = town({ houses: [house('townhall', 3, 3), house('cottage', 1, 1, { level: 3 })] });
    expect(incomePerTick(upgraded, 50)).toBe(incomePerTick(plain, 50) + 2);
  });
});
