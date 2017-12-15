import tldjs from 'tldjs';
import { CosmeticFilter } from './parsing/cosmetic-filter';
import { NetworkFilter } from './parsing/network-filter';
import { fastStartsWith } from './utils';

function isAnchoredByHostname(
  filterHostname: string,
  hostname: string,
): boolean {
  const matchIndex = hostname.indexOf(filterHostname);
  // Either start at beginning of hostname or be preceded by a '.'
  return (
    matchIndex === 0 || (matchIndex > 0 && hostname[matchIndex - 1] === '.')
  );
}

// pattern
function checkPatternPlainFilter(filter: NetworkFilter, { url }): boolean {
  return url.indexOf(filter.getFilter()) !== -1;
}

// pattern|
function checkPatternRightAnchorFilter(
  filter: NetworkFilter,
  { url },
): boolean {
  return url.endsWith(filter.getFilter());
}

// |pattern
function checkPatternLeftAnchorFilter(filter: NetworkFilter, { url }): boolean {
  return fastStartsWith(url, filter.getFilter());
}

// |pattern|
function checkPatternLeftRightAnchorFilter(
  filter: NetworkFilter,
  { url },
): boolean {
  return url === filter.getFilter();
}

// pattern*^
function checkPatternRegexFilter(filter: NetworkFilter, { url }): boolean {
  return filter.getRegex().test(url);
}

// ||pattern*^
function checkPatternHostnameAnchorRegexFilter(
  filter: NetworkFilter,
  { url, hostname },
): boolean {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    return checkPatternRegexFilter(filter, { url });
  }

  return false;
}

// ||pattern|
function checkPatternHostnameRightAnchorFilter(
  filter: NetworkFilter,
  { url, hostname },
): boolean {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    // Since this is not a regex, the filter pattern must follow the hostname
    // with nothing in between. So we extract the part of the URL following
    // after hostname and will perform the matching on it.
    const urlAfterHostname = url.substring(
      url.indexOf(filter.getHostname()) + filter.getHostname().length,
    );

    // Since it must follow immediatly after the hostname and be a suffix of
    // the URL, we conclude that filter must be equal to the part of the
    // url following the hostname.
    return filter.getFilter() === urlAfterHostname;
  }

  return false;
}

// ||pattern
function checkPatternHostnameAnchorFilter(
  filter: NetworkFilter,
  { url, hostname },
): boolean {
  if (isAnchoredByHostname(filter.getHostname(), hostname)) {
    // Since this is not a regex, the filter pattern must follow the hostname
    // with nothing in between. So we extract the part of the URL following
    // after hostname and will perform the matching on it.
    const urlAfterHostname = url.substring(
      url.indexOf(filter.getHostname()) + filter.getHostname().length,
    );

    // Otherwise, it should only be a prefix of the URL.
    return fastStartsWith(urlAfterHostname, filter.getFilter());
  }

  return false;
}

/**
 * Specialize a network filter depending on its type. It allows for more
 * efficient matching function.
 */
function checkPattern(filter: NetworkFilter, request): boolean {
  if (filter.isHostnameAnchor()) {
    if (filter.isRegex()) {
      return checkPatternHostnameAnchorRegexFilter(filter, request);
    } else if (filter.isRightAnchor()) {
      return checkPatternHostnameRightAnchorFilter(filter, request);
    }
    return checkPatternHostnameAnchorFilter(filter, request);
  } else if (filter.isRegex()) {
    return checkPatternRegexFilter(filter, request);
  } else if (filter.isLeftAnchor() && filter.isRightAnchor()) {
    return checkPatternLeftRightAnchorFilter(filter, request);
  } else if (filter.isLeftAnchor()) {
    return checkPatternLeftAnchorFilter(filter, request);
  } else if (filter.isRightAnchor()) {
    return checkPatternRightAnchorFilter(filter, request);
  }

  return checkPatternPlainFilter(filter, request);
}

function checkOptions(filter: NetworkFilter, request): boolean {
  // This is really cheap and should be done first
  if (!filter.isCptAllowed(request.cpt)) {
    return false;
  }

  // Source
  const sHost = request.sourceHostname;
  const sHostGD = request.sourceGD;

  // Url endpoint
  const hostGD = request.hostGD;
  const isFirstParty = sHostGD === hostGD;

  // Check option $third-party
  // source domain and requested domain must be different
  if (!filter.firstParty() && isFirstParty) {
    return false;
  }

  // $~third-party
  // source domain and requested domain must be the same
  if (!filter.thirdParty() && !isFirstParty) {
    return false;
  }

  // URL must be among these domains to match
  if (filter.hasOptDomains()) {
    const optDomains = filter.getOptDomains();
    if (
      optDomains.size > 0 &&
      !(optDomains.has(sHostGD) || optDomains.has(sHost))
    ) {
      return false;
    }
  }

  // URL must not be among these domains to match
  if (filter.hasOptNotDomains()) {
    const optNotDomains = filter.getOptNotDomains();
    if (
      optNotDomains.size > 0 &&
      (optNotDomains.has(sHostGD) || optNotDomains.has(sHost))
    ) {
      return false;
    }
  }

  return true;
}

export function matchNetworkFilter(filter: NetworkFilter, request): boolean {
  return checkOptions(filter, request) && checkPattern(filter, request);
}

/* Checks that hostnamePattern matches at the end of the hostname.
 * Partial matches are allowed, but hostname should be a valid
 * subdomain of hostnamePattern.
 */
function checkHostnamesPartialMatch(
  hostname: string,
  hostnamePattern: string,
): boolean {
  let pattern = hostnamePattern;
  if (fastStartsWith(hostnamePattern, '~')) {
    pattern = pattern.substr(1);
  }

  if (hostname.endsWith(pattern)) {
    const patternIndex = hostname.length - pattern.length;
    if (patternIndex === 0 || hostname[patternIndex - 1] === '.') {
      return true;
    }
  }

  return false;
}

/* Checks if `hostname` matches `hostnamePattern`, which can appear as
 * a domain selector in a cosmetic filter: hostnamePattern##selector
 *
 * It takes care of the concept of entities introduced by uBlock: google.*
 * https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#entity-based-cosmetic-filters
 */
function matchHostname(hostname: string, hostnamePattern: string): boolean {
  if (hostnamePattern.endsWith('.*')) {
    // Match entity:
    const entity = hostnamePattern.slice(0, -2);

    // Ignore TLDs suffix
    const publicSuffix = tldjs.getPublicSuffix(hostname);
    const hostnameWithoutSuffix = hostname.substr(
      0,
      hostname.length - publicSuffix.length - 1,
    );

    if (hostnameWithoutSuffix.length > 0) {
      // Check if we have a match
      return checkHostnamesPartialMatch(hostnameWithoutSuffix, entity);
    }

    return false;
  }

  return checkHostnamesPartialMatch(hostname, hostnamePattern);
}

export function matchCosmeticFilter(
  filter: CosmeticFilter,
  hostname: string,
): { hostname: string } | null {
  // Check hostnames
  if (filter.hasHostnames() && hostname) {
    const hostnames = filter.getHostnames();
    for (let i = 0; i < hostnames.length; i += 1) {
      if (matchHostname(hostname, hostnames[i])) {
        return { hostname: hostnames[i] };
      }
    }

    // No hostname match
    return null;
  }

  return { hostname: '' };
}
