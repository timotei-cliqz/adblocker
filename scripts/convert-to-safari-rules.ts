// @ts-ignore
import { isValid } from 'tldjs';
import { convertCosmetics, convertFilter } from '../src/convertion/safari-rules';
import { parseList } from '../src/parsing/list';
import { fetchLists } from './fetch-lists';

const allowedTriggerKeys = new Set([
  'url-filter', 'url-filter-is-case-sensitive', 'if-domain',
  'unless-domain', 'resource-type', 'load-type', 'if-top-url', 'unless-top-url',
]);

const allowedActionKeys = new Set([
  'type', 'selector',
]);

const allowedResourceTypes = new Set([
  'document', 'image', 'style-sheet', 'script', 'font', 'raw', 'svg-document', 'media', 'popup',
]);

const allowedLoadTypes = new Set(['first-party', 'third-party']);

const allowedActions = new Set(['block', 'block-cookies', 'css-display-none', 'ignore-previous-rules', 'make-https']);

const fs = require('fs');

function checkObjectKeysAllowed(keys: string[], allowedKeys: Set<string>) {
  for (let i = 0; i < keys.length; i += 1) {
    if (!allowedKeys.has(keys[i])) {
      throw new Error('key not allowed');
     }
  }
}

function isOfType(thing: any, type: string, errormsg: string) {
  isSame(typeof thing, type, errormsg);
}

function isSame(thing: any, anotherThing: any, errormsg: string) {
  if (thing !== anotherThing) {
    throw new Error(errormsg + ' | ' + thing + ' | ' + anotherThing);
  }
}

function isNotSame(thing: any, anotherThing: any, errormsg: string) {
  if (thing === anotherThing) {
    throw new Error(errormsg + ' | ' + thing + ' | ' + anotherThing);
  }
}

function isGreaterThan(thing: number, anotherThing: number, errormsg: string) {
  if (thing <= anotherThing) {
    throw new Error(errormsg + ' | ' + thing + ' | ' + anotherThing);
  }
}

function isDomainValid(domain: string, starAllowed: boolean, type: FilterType, filter: any) {
  function validate(d: string) {
    if (!isValid(d)) {
      const filterType = type === 0 ? 'network' : 'cosmetic';
      //throw new Error(filterType + ' filter contains a domain that is not valid | domain = ' + domain + ' | filter.hostnames = ' + filter.hostnames );
      console.log(filterType + ' filter contains a domain that is not valid | domain = ' + domain + ' | filter.hostnames = ' + filter.hostnames );
    }
  }

  const index = domain.indexOf('*');
  // const { isValid } = require('tldjs');
  if (index > -1) {
    if (index === 0 && starAllowed === true) {
      validate(domain.substr(1));
    } else {
      //throw new Error('* is not allowed in a domain');
      console.log(domain);
    }
  } else {
    validate(domain);
  }
}

enum FilterType {
  network,
  cosmetic,
}

export function testRule(rule: any, type: FilterType, filter: any) {
  // TODO: test if string is punycode encoded.

  // rule must be an object
  // expect(typeof rule).toBe('object');
  isOfType(rule, 'object', 'rule must be of type object');

  // rule must have only 2 keys, action and trigger, of type object
  // expect(Object.keys(rule).length).toBe(2);
  isSame(Object.keys(rule).length, 2, 'rule must have 2 keys');
  // expect(typeof rule.action).toBe('object');
  isOfType(rule.action, 'object',  'action must be of type object');
  // expect(typeof rule.trigger).toBe('object');
  isOfType(rule.trigger, 'object',  'trigger must be of type object');

  // trigger must have a non-empty url-filter, of type string
  const urlfilter = rule.trigger['url-filter'];
  // expect(typeof urlfilter).toBe('string');
  isOfType(urlfilter, 'string',  'url-filter must be of type string');
  // expect(urlfilter).not.toBe('');
  isNotSame(urlfilter, '', 'url-filter cannot be an empty string');

  // trigger can only have the following keys
  // expect(allowedTriggerKeys).toContainKeys(Object.keys(rule.trigger));
  checkObjectKeysAllowed(Object.keys(rule.trigger), allowedTriggerKeys);

  // action must have a type, with a value of type string
  // expect(typeof rule.action.type).toBe('string');
  isOfType(rule.action.type, 'string', 'action must have a type, with a value of type string');
  // expect(rule.action.type).not.toBe('');
  isNotSame(rule.action.type, '', 'type cannot be an empty string');

  // action can only have the following keys
  // expect(allowedActionKeys).toContainKeys(Object.keys(rule.action));
  checkObjectKeysAllowed(Object.keys(rule.action), allowedActionKeys);

  // url-filter must contain a valid regex
  // test if the value is a valid regex
  let value = rule.trigger['url-filter'];
  let isValidRegex = true;
  try {
    RegExp(value);
  } catch (e) {
    isValidRegex = false;
  }
  // expect(isValid).toBe(true);
  isSame(isValidRegex, true, 'url-filter must be a valid regex');

  // url-filter-is-case-sensitive should be a boolean
  value = rule.trigger['url-filter-is-case-sensitive'];
  if (value !== undefined) {
    // expect(typeof value).toBe('boolean');
    isOfType(value, 'boolean', 'url-filter-is-case-sensitive should be a boolean');
  }

  // if-domain must be a non-empty array of punnycode lowercase strings
  value = rule.trigger['if-domain'];
  if (value !== undefined) {
    // expect(Array.isArray(value)).toBe(true);
    isSame(Array.isArray(value), true, 'if-domain must be a non-empty array of punnycode lowercase strings');
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'if-domain cannot be an empty array');

    for (let j = 0; j < value.length; j += 1) {
      const elem = value[j];
      // expect(typeof elem).toBe('string');
      isOfType(elem, 'string', 'domain must be a string');
      // expect(elem === elem.toLowerCase()).toBe(true);
      isSame(elem, elem.toLowerCase(), 'domain must be a lowercase string');
      isDomainValid(elem, true, type, filter);
    }
  }

  // unless-domain must be a non-empty array of punnycode lowercase strings
  value = rule.trigger['unless-domain'];
  if (value !== undefined) {
    // expect(Array.isArray(value)).toBe(true);
    isSame(Array.isArray(value), true, 'unless-domain must be a non-empty array of punnycode lowercase strings');
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'unless-domain cannot be an empty array');
    for (let j = 0; j < value.length; j += 1) {
      const elem = value[j];
      // expect(typeof elem).toBe('string');
      isOfType(elem, 'string', 'domain must be a string');
      // expect(elem === elem.toLowerCase()).toBe(true);
      isSame(elem, elem.toLowerCase(), 'domain must be a lowercase string');
      isDomainValid(elem, true, type, filter);
    }
  }

  // resource-type must be a non-empty array of strings with the following values
  value = rule.trigger['resource-type'];
  if (value !== undefined) {
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'resource-type must be a non-empty array of strings');
    checkObjectKeysAllowed(value, allowedResourceTypes);
  }

  // load-type must be a non-empty array of strings with the following values
  value = rule.trigger['load-type'];
  if (value !== undefined) {
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'load-type must be a non-empty array of strings');
    checkObjectKeysAllowed(value, allowedLoadTypes);
  }

  // if-top-url must be a non-empty array of punnycode lowercase strings
  value = rule.trigger['if-top-url'];
  if (value !== undefined) {
    // expect(Array.isArray(value)).toBe(true);
    isSame(Array.isArray(value), true, 'if-top-url must be a non-empty array of punnycode lowercase strings');
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'if-top-url cannot be an empty array');
    for (let j = 0; j < value.length; j += 1) {
      const elem = value[j];
      // expect(typeof elem).toBe('string');
      isOfType(elem, 'string', 'domain must be a string');
      // expect(elem === elem.toLowerCase()).toBe(true);
      isSame(elem, elem.toLowerCase(), 'domain must be a lowercase string');
      // isDomainValid(elem, false, type, filter); this can have url patterns
    }
  }

  // unless-top-url must be a non-empty array of punnycode lowercase strings
  value = rule.trigger['unless-top-url'];
  if (value !== undefined) {
    // expect(Array.isArray(value)).toBe(true);
    isSame(Array.isArray(value), true, 'unless-top-url must be a non-empty array of punnycode lowercase strings');
    // expect(value.length).not.toBeLessThan(1);
    isGreaterThan(value.length, 0, 'unless-top-url cannot be an empty array');
    for (let j = 0; j < value.length; j += 1) {
      const elem = value[j];
      // expect(typeof elem).toBe('string');
      isOfType(elem, 'string', 'domain must be a string');
      // expect(elem === elem.toLowerCase()).toBe(true);
      isSame(elem, elem.toLowerCase(), 'domain must be a lowercase string');
      // isDomainValid(elem, false, type, filter); this can have url patterns
    }
  }

  // type must be a string with the following possible values
  value = rule.action.type;
  // expect(allowedActions.has(value)).toBe(true);
  isSame(allowedActions.has(value), true, 'invalid type');

  // if type is css-display-none, a non-empty selector must exist
  if (rule.action.type === 'css-display-none') {
    // expect(rule.action.selector).not.toBeUndefined();
    isNotSame(rule.action.selector, undefined, 'if type is css-display-none, a non-empty selector must exist');
    // expect(rule.action.selector).not.toBe('');
    isNotSame(rule.action.selector, '', 'selector cannot be an empty string when the type is css-display-none');
  }

  // selector must be a non-empty string
  value = rule.action.selector;
  if (value !== undefined) {
    // expect(typeof value).toBe('string');
    isOfType(value, 'string', 'selector must be a string');
    // expect(value).not.toBe('');
    isNotSame(value, '', 'selector cannot be an emtpy string');
  }

  // trigger cannot contain both if-domain and unless-domain
  const ifdomain = rule.trigger['if-domain'];
  const unlessdomain = rule.trigger['unless-domain'];
  if (ifdomain !== undefined) {
    // expect(unlessdomain).toBeUndefined();
    isSame(unlessdomain, undefined, 'trigger cannot contain both if-domain and unless-domain');
  } else if (unlessdomain !== undefined) {
    // expect(ifdomain).toBeUndefined();
    isSame(ifdomain, undefined, 'trigger cannot contain both if-domain and unless-domain');
  }

  // trigger cannot contain both if-top-url and unless-top-url
  const ifurl = rule.trigger['if-top-url'];
  const unlessurl = rule.trigger['unless-top-url'];
  if (ifurl !== undefined) {
    // expect(unlessurl).toBeUndefined();
    isSame(unlessurl, undefined, 'trigger cannot contain both if-top-url and unless-top-url');
  } else if (unlessurl !== undefined) {
    // expect(ifurl).toBeUndefined();
    isSame(ifurl, undefined, 'trigger cannot contain both if-top-url and unless-top-url');
  }
}

export function convertAndValidateFilters(lists: string) {
  const exceptionsDict = {'@@||www.google.*/ads/$~third-party,domain=google.ca|google.co.in|google.co.nz|google.co.uk|google.co.za|google.com|google.com.au|google.com.eg|google.de|google.es|google.ie|google.it': 194,
  '@@||adservice.google.*/adsid/integrator.js$domain=twitch.tv': 5,
  '@@||amazon-adsystem.com/aax2/apstag.js$domain=blastingnews.com|eurogamer.net|nintendolife.com|nydailynews.com|rockpapershotgun.com|twitch.tv|usgamer.net|vg247.com|wcvb.com': 4,
  '@@||imasdk.googleapis.com^$domain=twitch.tv': 3,
  '@@||ads.nicovideo.jp/assets/js/ads-*.js': 3,
  '@@||ias.rakuten.co.jp^$domain=rakuten.co.jp': 7,
  '@@||nyt.com^*/ad-view-manager.js$domain=nytimes.com': 1,
  '@@||s0.2mdn.net/instream/*$domain=cnet.com|nfl.com|wistv.com': 2,
  '@@||imasdk.googleapis.com/js/sdkloader/ima3.js$domain=dibujos.net|ensonhaber.com|f5haber.com|marieclaire.fr|r7.com|radio-canada.ca|uol.com.br': 4,
  '@@||pagead2.googlesyndication.com/pagead/show_companion_ad.js$domain=gamespot.com': 2,
  '@@||aolcdn.com^*/adsWrapper.$domain=aol.com|engadget.com|games.com|huffingtonpost.com|mapquest.com|stylelist.ca': 4,
  '@@||flvto.biz/scripts/ads.js': 2,
  '@@||imasdk.googleapis.com/js/sdkloader/ima3.js$domain=allcatvideos.com|audiomack.com|beinsports.com|bloomberg.com|cbc.ca|cbsnews.com|cbssports.com|cnet.com|complex.com|cwtv.com|gamejolt.com|healthmeans.com|indystar.com|mobg.io|news.sky.com|play.ludigames.com|player.performgroup.com|powr.com|rumble.com|snopes.com|thestreet.com|theverge.com|usatoday.com|video.foxbusiness.com|video.foxnews.com|vidyomani.com|yiv.com': 7,
  '@@||adservice.google.*/integrator.js$domain=gsmarena.com|nydailynews.com': 8,
  '@@||bancodevenezuela.com/imagenes/publicidad/$~third-party': 8,
  '@@||conative.de/serve/domain/158/config.js$domain=spiegel.de': 1,
  '@@||conative.de^*/adscript.min.js$domain=spiegel.de': 1,
  '@@||2mdn.net/instream/html5/ima3.js$domain=~superfilm.pl': 14,
  '@@||media.net/bidexchange.js$domain=reuters.com': 3,
  '@@||pagead2.googlesyndication.com/pagead/js/adsbygoogle.js$domain=slideplayer.com|tampermonkey.net|thefreedictionary.com': 5,
  '@@||pagead2.googlesyndication.com/pagead/js/*/show_ads_impl.js$domain=downloads.codefi.re|freeclaimbtc.xyz|globaldjmix.com|gsmdude.com|hulkusc.com|nlfreevpn.com|oldapps.com|pattayaone.net|receive-a-sms.com|slideplayer.com|talksms.com|tampermonkey.net|thefreedictionary.com|unlockpwd.com|uploadex.com|windows7themes.net': 3,
  '@@||mobinozer.com^*/gads.js': 1,
  '@@||mobinozer.com^*/advert.js': 1,
  '@@||exoclick.com/ad_track.js': 14,
  '@@||dianomi.com/partner/marketwatch/js/dianomi-marketwatch.js?$domain=marketwatch.com': 2,
  '@@||google.com/adsense/search/ads.js$domain=armstrongmywire.com|atlanticbb.net|bestbuy.com|bresnan.net|broadstripe.net|buckeyecablesystem.net|cableone.net|centurylink.net|charter.net|cincinnatibell.net|dish.net|forbbbs.org|gumtree.com.au|hargray.net|hawaiiantel.net|hickorytech.net|homeaway.co.uk|knology.net|livestrong.com|mediacomtoday.com|midco.net|mybendbroadband.com|mybrctv.com|mycenturylink.com|myconsolidated.net|myepb.net|mygrande.net|mygvtc.com|myhughesnet.com|myritter.com|northstate.net|nwcable.net|query.nytimes.com|rentals.com|search.rr.com|searchresults.verizon.com|suddenlink.net|surewest.com|synacor.net|tds.net|toshiba.com|trustedreviews.com|truvista.net|windstream.net|windstreambusiness.net|wowway.net|www.google.com|zoover.co.uk|zoover.com': 1,
  '@@||folha.uol.com.br/paywall/js/1/publicidade.ads.js': 3,
  '@@||adf.ly^$~third-party': 3,
  '@@||ynet.co.il^*/ads.js': 1,
  '@@||dashboard.marketgid.com^$~third-party': 1,
  '@@||c1.popads.net/pop.js$domain=skidrowreloaded.com': 4,
  '@@||ads.servebom.com/tmnhead.js$domain=livescience.com': 3,
  '@@||k01k0.com^$domain=nme.com|trustedreviews.com': 8,
  '@@||namesakeoscilloscopemarquis.com^*/ads.js$domain=~tvil.me': 4,
  '@@||pcworld.com/www/js/ads/jquery.lazyload-ad.js': 1,
  '@@||server.cpmstar.com/view.aspx?poolid=$domain=newgrounds.com|xfire.com': 26,
  '@@||thenextweb.com/wp-content/advertisement.js': 3,
  '@@||g.doubleclick.net/static/glade.js$domain=eurogamer.net|nintendolife.com|rockpapershotgun.com|usgamer.net|vg247.com': 2,
  '@@||doubleclick.net/instream/ad_status.js$domain=eurogamer.net|nintendolife.com|rockpapershotgun.com|usgamer.net|vg247.com': 1,
  '@@||warnerbros-d.openx.net^$domain=dramafever.com': 1,
  '@@||hentai-foundry.com^*/ads.js': 2,
  '@@||animenewsnetwork.com/javascripts/advertisement.js': 1,
  '@@||admost.com/adx/js/admost.js$domain=mackolik.com|sahadan.com': 4,
  '@@||exoclick.com/invideo.js': 2};
  const { networkFilters, cosmeticFilters } = parseList(lists, {'loadNetworkFilters': true, 'loadCosmeticFilters': true, 'debug': true});
  const rules: any[] = [];
  const exceptions: any[] = [];

  for (let j = 0; j < networkFilters.length; j += 1) {
    const filter = networkFilters[j];
    const rule = convertFilter(filter);
    if (rule !== null && rule !== undefined) {
      testRule(rule, FilterType.network, filter);
      if (rule.action.type === 'ignore-previous-rules') {
        if ((filter.rawLine || '') in exceptionsDict) {
          exceptions.push(rule);
        }
      } else {
        rules.push(rule);
      }
    }
  }

  for (let i = 0; i < cosmeticFilters.length; i += 1) {
    const cosmetic = cosmeticFilters[i];
    const rule = convertCosmetics(cosmetic);
    if (rule !== null && rule !== undefined) {
      testRule(rule, FilterType.cosmetic, cosmetic);
      rules.push(rule);
    }
  }
  // console.log("YALOOOOOO  ==  ", exceptions.length);
  // write the rules and the exceptions to different files
  const excep_JSON = JSON.stringify(exceptions);
  const rules_JSON = JSON.stringify(rules);

  fs.writeFile('./exceptions.json', excep_JSON, function(err: string) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
  }); 

  fs.writeFile('./rules.json', rules_JSON, function(err: string) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
  }); 

  return '';
}

const adblockerLists = [
  //'https://easylist.to/easylist/easylist.txt',
  //'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt',
  //'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
  //'/https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
  //'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt',
  //'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
  'https://easylist.to/easylistgermany/easylistgermany.txt',
  'https://easylist.to/easylist/easylist.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
  'ttps://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
];

// const antitrackingLists = [
//   'https://easylist.to/easylist/easyprivacy.txt',
//   'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
// ]

function main() {
  fetchLists(adblockerLists).then(list => {
    // tslint:disable-next-line
    console.log(convertAndValidateFilters(list.join('\n')));
  });
}

main();
