import {} from 'jest';

import { parseList } from '../src/parsing/list';
import { fastHash, tokenize, tokenizeCSS } from '../src/utils';
import { loadAllLists } from './utils';

expect.extend({
  toNotCollideWithOtherFilter(filter: { id: number }, map) {
    const found = map.get(filter.id);
    if (found !== undefined && found !== filter.toString()) {
      return {
        message: () =>
          `expected ${filter.toString()} to not collide, found ${found} (${filter.id})`,
        pass: false,
      };
    }

    return {
      message: () => 'Ok',
      pass: true,
    };
  },
});

function checkCollisions(filters) {
  const hashes = new Map();
  for (let i = 0; i < filters.length; i += 1) {
    const filter = filters[i];
    // @ts-ignore
    expect(filter).toNotCollideWithOtherFilter(hashes);
    hashes.set(filter.id, filters[i].toString());
  }
}

function checkTokens(str: string, tokens: string[]) {
  const hashedTokens: number[] = tokens.map(fastHash);
  expect(hashedTokens).toEqual(tokenize(str));
}

function checkCSSTokens(str: string, tokens: string[]) {
  const hashedTokens: number[] = tokens.map(fastHash);
  expect(hashedTokens).toEqual(tokenizeCSS(str));
}

describe('Utils', () => {
  describe('fastHash', () => {
    const { networkFilters, cosmeticFilters } = parseList(loadAllLists());

    it('does not produce collision on network filters', () => {
      checkCollisions(networkFilters);
    });

    it('does not produce collision on cosmetic filters', () => {
      checkCollisions(cosmeticFilters);
    });
  });

  it('#tokenize', () => {
    checkTokens('', []);
    checkTokens('', []);
    checkTokens('foo', ['foo']);
    checkTokens('foo/bar', ['foo', 'bar']);
    checkTokens('foo-bar', ['foo', 'bar']);
    checkTokens('foo.bar', ['foo', 'bar']);
  });

  it('#tokenizeCSS', () => {
    checkCSSTokens('', []);
    checkCSSTokens('.selector', ['.selector']);
    checkCSSTokens('.selector-foo', ['.selector-foo']);
  });
});
