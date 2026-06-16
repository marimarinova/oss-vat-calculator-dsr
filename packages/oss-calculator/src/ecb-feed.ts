/**
 * ECB Daily XML Feed Parser
 *
 * Parses the ECB's eurofxref-daily.xml published at:
 *   https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 *
 * Schema (stable since 2000):
 *   <gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
 *                    xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
 *     <Cube>
 *       <Cube time="YYYY-MM-DD">
 *         <Cube currency="USD" rate="1.0896"/>
 *         ...
 *       </Cube>
 *     </Cube>
 *   </gesmes:Envelope>
 *
 * All rates are expressed as 1 EUR = <rate> <currency>.
 */

import { DailyECBRate } from './ecb-rates';

/**
 * Parse the ECB eurofxref-daily.xml and return an array of DailyECBRate
 * records ready to be loaded into the module-level store via registerDailyRate().
 *
 * Throws if the XML contains no recognisable date or no rate entries.
 */
export function parseECBDailyXML(xml: string): DailyECBRate[] {
  const dateMatch = xml.match(/Cube\s+time="(\d{4}-\d{2}-\d{2})"/);
  if (!dateMatch) {
    throw new Error('parseECBDailyXML: no <Cube time="..."> element found in XML');
  }
  const publishedOn = dateMatch[1];

  const rates: DailyECBRate[] = [];
  // Matches both self-closing (<Cube .../>) and potential open tags
  const ratePattern = /Cube\s+currency="([A-Z]{3})"\s+rate="([\d.]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = ratePattern.exec(xml)) !== null) {
    rates.push({
      base: 'EUR',
      target: match[1],
      rate: parseFloat(match[2]),
      publishedOn,
    });
  }

  if (rates.length === 0) {
    throw new Error(`parseECBDailyXML: no <Cube currency=...> entries found for ${publishedOn}`);
  }

  return rates;
}
