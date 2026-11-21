import { themeDef } from '../core/catalog';
import { activeFeatures } from '../core/rules';
import { featureCss, featureFiles } from './features';
import { siteDirection } from './strings';
import type { Town } from '../core/types';
import { siteCSS } from './css';
import { fileNames, orderedHouses } from './links';
import { pageHTML } from './page';

export interface SiteFile {
  path: string;
  content: string;
}

const readme = (town: Town) =>
  [
    `${town.name} — your website!`,
    '',
    'Open index.html in any browser to see it.',
    '',
    'To put it online for free, drag this whole folder onto https://app.netlify.com/drop',
    '',
    'To keep editing, open WebCity again (your town is saved there),',
    'or use "Open project file" with the town-project.json file.',
  ].join('\r\n');

export function buildSite(town: Town): SiteFile[] {
  const names = fileNames(town);
  const features = activeFeatures(town);
  return [
    ...orderedHouses(town).map((house) => ({ path: names.get(house.id)!, content: pageHTML(town, house, 'export') })),
    {
      path: 'style.css',
      content: siteCSS(themeDef(town.theme), town, {
        persian: siteDirection(town.site?.lang, town.site?.dir) === 'rtl',
        extra: featureCss(features),
      }),
    },
    ...featureFiles(features, town, themeDef(town.theme).site.primary),
    { path: 'README.txt', content: readme(town) },
  ];
}
