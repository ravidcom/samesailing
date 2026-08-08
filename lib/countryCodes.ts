/** ISO 3166-1 alpha-2 codes for flagcdn.com, matching lib/countries.ts. */
export const COUNTRY_CODES: Record<string, string> = {
  Afghanistan: "AF", Albania: "AL", Algeria: "DZ", Argentina: "AR", Australia: "AU",
  Austria: "AT", Belgium: "BE", Bolivia: "BO", Brazil: "BR", Bulgaria: "BG",
  Canada: "CA", Chile: "CL", China: "CN", Colombia: "CO", Croatia: "HR",
  "Czech Republic": "CZ", Denmark: "DK", Ecuador: "EC", Egypt: "EG", Estonia: "EE",
  Ethiopia: "ET", Finland: "FI", France: "FR", Germany: "DE", Greece: "GR",
  Hungary: "HU", India: "IN", Indonesia: "ID", Iran: "IR", Iraq: "IQ",
  Ireland: "IE", Israel: "IL", Italy: "IT", Japan: "JP", Jordan: "JO",
  Kazakhstan: "KZ", Kenya: "KE", Latvia: "LV", Lebanon: "LB", Lithuania: "LT",
  Malaysia: "MY", Mexico: "MX", Morocco: "MA", Netherlands: "NL", "New Zealand": "NZ",
  Nigeria: "NG", Norway: "NO", Pakistan: "PK", Paraguay: "PY", Peru: "PE",
  Philippines: "PH", Poland: "PL", Portugal: "PT", Romania: "RO", Russia: "RU",
  "Saudi Arabia": "SA", Serbia: "RS", Singapore: "SG", Slovakia: "SK", "South Africa": "ZA",
  "South Korea": "KR", Spain: "ES", Sweden: "SE", Switzerland: "CH", Taiwan: "TW",
  Thailand: "TH", Tunisia: "TN", Turkey: "TR", Ukraine: "UA", "United Arab Emirates": "AE",
  "United Kingdom": "GB", "United States": "US", Uruguay: "UY", Venezuela: "VE", Vietnam: "VN",
};

export function flagUrl(country: string): string | null {
  const code = COUNTRY_CODES[country];
  return code ? `https://flagcdn.com/20x15/${code.toLowerCase()}.png` : null;
}
