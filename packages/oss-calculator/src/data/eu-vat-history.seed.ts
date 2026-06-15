/**
 * EU VAT Rate History Seed Data (Refactor 1 - scoped to 5 Member States)
 *
 * This file is the single source of truth for `EU_VAT_RATES` (re-exported
 * from `../vat-rates`). Each `VATRate` entry carries provenance
 * (`sourceUrl`, `legalBasis`) alongside its validity interval
 * (`effectiveFrom` / `effectiveTo`).
 *
 * Provenance convention for this refactor:
 *  - `sourceUrl` holds the verified source CITATION as supplied during
 *    review (publisher name, e.g. "PwC Worldwide Tax Summaries -
 *    Bulgaria"). These are NOT yet resolved to clickable hyperlinks -
 *    replacing them with verified URLs is future work.
 *  - `legalBasis` is a short human-readable description of the rate and,
 *    where relevant, caveats about scope/category.
 *
 * Date placeholder convention:
 *  - `EPOCH` (1970-01-01) marks the start of an interval whose true start
 *    date was NOT verified in this refactor. It is a sentinel meaning
 *    "in effect for at least as far back as verified, exact start out of
 *    scope for R1" - it is NOT an asserted historical fact.
 *  - `BASELINE` (2020-01-01) is the pre-Refactor-1 snapshot date used for
 *    "current-only, no verified history (future work)" entries, matching
 *    the dates already present in the pre-refactor rate table.
 *
 * Verified history (R1 scope - BG, DE, FR, NL, AT):
 *  - BG standard: 20% from 1999-04-01 (current) [PwC]
 *  - BG reduced (books/periodicals): 9% from 2020-07-01, made permanent
 *    from 2023-01-01 [WTS Klient]. NOTE: the temporary 9% reduced rate for
 *    restaurant/catering (2020-07-01..2024-12-31) reverted to the standard
 *    rate (20%) from 2025-01-01 [vatcalc]. Category-specific reduced-rate
 *    tracking (restaurant vs. books) is future work - this table tracks
 *    only the books/periodicals reduced rate, which remains 9%.
 *  - DE standard: 19% until 2020-06-30; 16% 2020-07-01..2020-12-31;
 *    19% from 2021-01-01 [eClear/ASD]
 *  - DE reduced: 7% until 2020-06-30; 5% 2020-07-01..2020-12-31;
 *    7% from 2021-01-01 [eClear]
 *  - FR standard: 20% from 2014-01-01 (current) [Tax Foundation]
 *  - NL standard: 21% from 2012-10-01 (current) [Tax Foundation]
 *  - NL reduced: 6% until 2018-12-31; 9% from 2019-01-01 [Tax Foundation]
 *  - AT standard: 20% (current, long-standing) [VATupdate]
 *  - AT reduced (10%/13% tracks): 5% temporary rate for
 *    hospitality/culture/publications 2020-07-01..2021-12-31, reverting to
 *    10%/13% from 2022-01-01 [vatcalc]
 *
 * All other Member States and rate categories not listed above keep their
 * pre-Refactor-1 single current rate as one open interval starting at
 * BASELINE, marked "current-only, no verified history (future work)".
 */

import type { MemberStateRates } from '../vat-rates';

const EPOCH = new Date('1970-01-01');
const BASELINE = new Date('2020-01-01');

const UNVERIFIED_SOURCE = 'Not yet verified (future work)';
const UNVERIFIED_BASIS =
  'Current-only rate carried over from the pre-Refactor-1 table; no verified history yet (future work)';

export const EU_VAT_RATE_HISTORY: Record<string, MemberStateRates> = {
  AT: {
    name: 'Austria',
    code: 'AT',
    standard: [
      {
        rate: 20,
        effectiveFrom: EPOCH,
        sourceUrl: 'VATupdate - Austria VAT rates',
        legalBasis:
          'Austrian standard VAT rate of 20%, long-standing (per VATupdate). Exact start date not verified in R1.',
      },
    ],
    reduced: [
      {
        rate: 10,
        effectiveFrom: EPOCH,
        effectiveTo: new Date('2020-06-30'),
        sourceUrl: 'vatcalc - Austria COVID-19 VAT rate changes',
        legalBasis:
          'Reduced rate of 10% prior to the temporary COVID-19 reduction. Exact start date not verified in R1.',
      },
      {
        rate: 5,
        effectiveFrom: new Date('2020-07-01'),
        effectiveTo: new Date('2021-12-31'),
        sourceUrl: 'vatcalc - Austria COVID-19 VAT rate changes',
        legalBasis:
          'Temporary 5% reduced rate for hospitality, culture, and publications (COVID-19 relief).',
      },
      {
        rate: 10,
        effectiveFrom: new Date('2022-01-01'),
        sourceUrl: 'vatcalc - Austria COVID-19 VAT rate changes',
        legalBasis: 'Reduced rate of 10% restored after the temporary COVID-19 reduction expired.',
      },
      {
        rate: 13,
        effectiveFrom: EPOCH,
        effectiveTo: new Date('2020-06-30'),
        sourceUrl: 'vatcalc - Austria COVID-19 VAT rate changes',
        legalBasis:
          'Reduced rate of 13% prior to the temporary COVID-19 reduction. Exact start date not verified in R1.',
      },
      {
        rate: 13,
        effectiveFrom: new Date('2022-01-01'),
        sourceUrl: 'vatcalc - Austria COVID-19 VAT rate changes',
        legalBasis: 'Reduced rate of 13% restored after the temporary COVID-19 reduction expired.',
      },
    ],
    superReduced: [],
  },
  BE: {
    name: 'Belgium',
    code: 'BE',
    standard: [
      {
        rate: 21,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 6,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 12,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  BG: {
    name: 'Bulgaria',
    code: 'BG',
    standard: [
      {
        rate: 20,
        effectiveFrom: new Date('1999-04-01'),
        sourceUrl: 'PwC Worldwide Tax Summaries - Bulgaria',
        legalBasis: 'Bulgarian standard VAT rate of 20%, in force since 1999-04-01 (per PwC).',
      },
    ],
    reduced: [
      {
        rate: 9,
        effectiveFrom: new Date('2020-07-01'),
        sourceUrl: 'WTS Klient - Bulgaria VAT rates',
        legalBasis:
          'Reduced rate of 9% for books/periodicals, in force since 2020-07-01 and made permanent from ' +
          '2023-01-01 (per WTS Klient). NOTE: the temporary 9% reduced rate for restaurant/catering services ' +
          '(2020-07-01..2024-12-31, per vatcalc) reverted to the standard rate (20%) from 2025-01-01; ' +
          'category-specific reduced-rate tracking is future work.',
      },
    ],
    superReduced: [],
  },
  HR: {
    name: 'Croatia',
    code: 'HR',
    standard: [
      {
        rate: 25,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 13,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  CY: {
    name: 'Cyprus',
    code: 'CY',
    standard: [
      {
        rate: 19,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 9,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  CZ: {
    name: 'Czech Republic',
    code: 'CZ',
    standard: [
      {
        rate: 21,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 12,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  DK: {
    name: 'Denmark',
    code: 'DK',
    standard: [
      {
        rate: 25,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [],
    superReduced: [],
  },
  EE: {
    name: 'Estonia',
    code: 'EE',
    standard: [
      {
        rate: 22,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 9,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  FI: {
    name: 'Finland',
    code: 'FI',
    standard: [
      {
        rate: 25.5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 10,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 14,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  FR: {
    name: 'France',
    code: 'FR',
    standard: [
      {
        rate: 20,
        effectiveFrom: new Date('2014-01-01'),
        sourceUrl: 'Tax Foundation - France VAT rate',
        legalBasis:
          'French standard VAT rate of 20%, in force since 2014-01-01 (per Tax Foundation).',
      },
    ],
    reduced: [
      {
        rate: 5.5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 10,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [
      {
        rate: 2.1,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
  },
  DE: {
    name: 'Germany',
    code: 'DE',
    standard: [
      {
        rate: 19,
        effectiveFrom: EPOCH,
        effectiveTo: new Date('2020-06-30'),
        sourceUrl: 'eClear/ASD - Germany VAT rate history',
        legalBasis:
          'German standard VAT rate of 19% prior to the 2020 COVID-19 temporary reduction. ' +
          'Exact start date not verified in R1.',
      },
      {
        rate: 16,
        effectiveFrom: new Date('2020-07-01'),
        effectiveTo: new Date('2020-12-31'),
        sourceUrl: 'eClear/ASD - Germany VAT rate history',
        legalBasis:
          'Temporary standard VAT rate of 16% (COVID-19 economic stimulus, 2020-07-01..2020-12-31).',
      },
      {
        rate: 19,
        effectiveFrom: new Date('2021-01-01'),
        sourceUrl: 'eClear/ASD - Germany VAT rate history',
        legalBasis: 'German standard VAT rate of 19% restored from 2021-01-01.',
      },
    ],
    reduced: [
      {
        rate: 7,
        effectiveFrom: EPOCH,
        effectiveTo: new Date('2020-06-30'),
        sourceUrl: 'eClear - Germany VAT rate history',
        legalBasis:
          'German reduced VAT rate of 7% prior to the 2020 COVID-19 temporary reduction. ' +
          'Exact start date not verified in R1.',
      },
      {
        rate: 5,
        effectiveFrom: new Date('2020-07-01'),
        effectiveTo: new Date('2020-12-31'),
        sourceUrl: 'eClear - Germany VAT rate history',
        legalBasis:
          'Temporary reduced VAT rate of 5% (COVID-19 economic stimulus, 2020-07-01..2020-12-31).',
      },
      {
        rate: 7,
        effectiveFrom: new Date('2021-01-01'),
        sourceUrl: 'eClear - Germany VAT rate history',
        legalBasis: 'German reduced VAT rate of 7% restored from 2021-01-01.',
      },
    ],
    superReduced: [],
  },
  EL: {
    name: 'Greece',
    code: 'EL',
    standard: [
      {
        rate: 24,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 6,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 13,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  HU: {
    name: 'Hungary',
    code: 'HU',
    standard: [
      {
        rate: 27,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 18,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  IE: {
    name: 'Ireland',
    code: 'IE',
    standard: [
      {
        rate: 23,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 9,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 13.5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [
      {
        rate: 4.8,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
  },
  IT: {
    name: 'Italy',
    code: 'IT',
    standard: [
      {
        rate: 22,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 10,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [
      {
        rate: 4,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
  },
  LV: {
    name: 'Latvia',
    code: 'LV',
    standard: [
      {
        rate: 21,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 12,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  LT: {
    name: 'Lithuania',
    code: 'LT',
    standard: [
      {
        rate: 21,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 9,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  LU: {
    name: 'Luxembourg',
    code: 'LU',
    standard: [
      {
        rate: 17,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 8,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [
      {
        rate: 3,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
  },
  MT: {
    name: 'Malta',
    code: 'MT',
    standard: [
      {
        rate: 18,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 7,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  NL: {
    name: 'Netherlands',
    code: 'NL',
    standard: [
      {
        rate: 21,
        effectiveFrom: new Date('2012-10-01'),
        sourceUrl: 'Tax Foundation - Netherlands VAT rate',
        legalBasis:
          'Dutch standard VAT rate of 21%, in force since 2012-10-01 (per Tax Foundation).',
      },
    ],
    reduced: [
      {
        rate: 6,
        effectiveFrom: EPOCH,
        effectiveTo: new Date('2018-12-31'),
        sourceUrl: 'Tax Foundation - Netherlands VAT rate',
        legalBasis:
          'Dutch reduced VAT rate of 6% prior to the 2019 increase. Exact start date not verified in R1.',
      },
      {
        rate: 9,
        effectiveFrom: new Date('2019-01-01'),
        sourceUrl: 'Tax Foundation - Netherlands VAT rate',
        legalBasis: 'Dutch reduced VAT rate increased to 9% from 2019-01-01.',
      },
    ],
    superReduced: [],
  },
  PL: {
    name: 'Poland',
    code: 'PL',
    standard: [
      {
        rate: 23,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 8,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  PT: {
    name: 'Portugal',
    code: 'PT',
    standard: [
      {
        rate: 23,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 6,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 13,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  RO: {
    name: 'Romania',
    code: 'RO',
    standard: [
      {
        rate: 19,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 9,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  SK: {
    name: 'Slovakia',
    code: 'SK',
    standard: [
      {
        rate: 23,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 10,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  SI: {
    name: 'Slovenia',
    code: 'SI',
    standard: [
      {
        rate: 22,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 9.5,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
  ES: {
    name: 'Spain',
    code: 'ES',
    standard: [
      {
        rate: 21,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 10,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [
      {
        rate: 4,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
  },
  SE: {
    name: 'Sweden',
    code: 'SE',
    standard: [
      {
        rate: 25,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    reduced: [
      {
        rate: 6,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
      {
        rate: 12,
        effectiveFrom: BASELINE,
        sourceUrl: UNVERIFIED_SOURCE,
        legalBasis: UNVERIFIED_BASIS,
      },
    ],
    superReduced: [],
  },
};
