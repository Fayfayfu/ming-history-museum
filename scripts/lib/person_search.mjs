import OpenCC from 'opencc-js';
import {pinyin} from 'pinyin-pro';

const toTraditional = OpenCC.Converter({from: 'cn', to: 'twp'});

const unique = (values) => [...new Set(values.filter(Boolean))];

export function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[\s·・'’`_-]+/g, '');
}

function nativeTerms(terms) {
  return unique(terms.flatMap((term) => {
    const value = String(term || '').trim();
    return value ? [value, toTraditional(value)] : [];
  }));
}

function pinyinTerms(terms) {
  return unique(terms.flatMap((term) => {
    const syllables = pinyin(term, {toneType: 'none', type: 'array'})
      .filter((value) => /^[a-z]+$/i.test(value))
      .map((value) => value.toLocaleLowerCase('en-US'));
    if (!syllables.length) return [];
    return [syllables.join(''), syllables.join(' '), syllables.map((value) => value[0]).join('')];
  }));
}

export function buildSearchIndex(terms) {
  const native = nativeTerms(terms);
  return {native, pinyin: pinyinTerms(native)};
}

export function matchesSearchIndex(search, text, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;
  if (normalizeSearchValue(text).includes(normalizedQuery)) return true;
  if ((search.native || []).some((term) => normalizeSearchValue(term).includes(normalizedQuery))) return true;
  if (!/^[a-z0-9]+$/i.test(normalizedQuery)) return false;
  return (search.pinyin || []).some((term) => normalizeSearchValue(term).includes(normalizedQuery));
}

function searchableText(person) {
  return [
    person.name,
    person.alt,
    person.title,
    person.category,
    person.office,
    person.hometown,
    person.summary,
    person.evaluation,
    ...(person.domains || []),
    person.parent,
    person.mother,
    person.notes,
  ].filter(Boolean).join(' ');
}

export function buildPersonSearchIndex(person) {
  return {
    ...person,
    search: buildSearchIndex([person.name, person.alt, person.title]),
  };
}

export function matchesPersonSearch(person, query) {
  const search = person.search || buildPersonSearchIndex(person).search;
  return matchesSearchIndex(search, search.text || searchableText(person), query);
}
