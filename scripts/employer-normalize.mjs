// employer-normalize.mjs
// Single source of truth for employer canonicalization, used by build-data.mjs.
// The SPA consumes pipeline-computed employerKey/display values — it must NOT
// re-normalize (that's how the old LFUCG tracker drifted out of agreement).
//
// Alias map is data-driven: built from a frequency pass over all 28 statewide
// KREF exports (2016–2026, ~78K unique raw employer strings).

/** Raw values that mean "no real employer" — excluded from employer aggregation. */
const EMPTY_EMPLOYER_VALUES = new Set([
  '', 'unknown', 'n/a', 'n.a.', 'none', 'na', 'retired', 'not employed', 'self',
  'self-employed', 'self employed', 'unemployed', 'homemaker', 'housewife',
  'information requested', 'info requested', 'requested', 'not applicable',
  'student', 'farmer', 'family farm', 'attorney', 'owner', 'private practice',
  'physician', 'realtor', 'consultant', 'candidate', 'disabled', 'unable to determine',
  'declined', 'declined to state', 'not provided', 'no employer', 'best efforts',
  'not disclosed', 'undisclosed', 'not available', 'no answer', 'did not respond',
  'response pending', 'pending', 'tbd', 'various', 'multiple', 'see attached',
  'not listed', 'no response', 'declined to answer', 'refused', 'anonymous',
]);

/**
 * Canonical aliases: lowercased/collapsed raw string -> canonical display name.
 * Multiple raw variants map to one display form. Applied AFTER suffix stripping,
 * so "frost brown todd llc" only needs the stripped form here.
 */
const EMPLOYER_ALIASES = {
  // State government
  'commonwealth of kentucky': 'Commonwealth of Kentucky',
  'commonwealth of ky': 'Commonwealth of Kentucky',
  'comm of ky': 'Commonwealth of Kentucky',
  'comm. of ky': 'Commonwealth of Kentucky',
  'comm of kentucky': 'Commonwealth of Kentucky',
  'state of kentucky': 'Commonwealth of Kentucky',
  'state of ky': 'Commonwealth of Kentucky',
  'kentucky state government': 'Commonwealth of Kentucky',
  'ky state government': 'Commonwealth of Kentucky',
  'kentucky': 'Commonwealth of Kentucky',
  'ky general assembly': 'Kentucky General Assembly',
  'kentucky general assembly': 'Kentucky General Assembly',
  'kentucky state senate': 'Kentucky General Assembly',
  'kentucky house of representatives': 'Kentucky General Assembly',
  // Universities
  'university of kentucky': 'University of Kentucky',
  'university of ky': 'University of Kentucky',
  'uk': 'University of Kentucky',
  'univ of kentucky': 'University of Kentucky',
  'univ. of kentucky': 'University of Kentucky',
  'uky': 'University of Kentucky',
  'uk healthcare': 'UK HealthCare',
  'university of kentucky healthcare': 'UK HealthCare',
  'university of louisville': 'University of Louisville',
  'uofl': 'University of Louisville',
  'u of l': 'University of Louisville',
  'univ of louisville': 'University of Louisville',
  'univ. of louisville': 'University of Louisville',
  'ul': 'University of Louisville',
  'western kentucky university': 'Western Kentucky University',
  'wku': 'Western Kentucky University',
  'eastern kentucky university': 'Eastern Kentucky University',
  'eku': 'Eastern Kentucky University',
  'northern kentucky university': 'Northern Kentucky University',
  'nku': 'Northern Kentucky University',
  'murray state university': 'Murray State University',
  'murray state': 'Murray State University',
  'morehead state university': 'Morehead State University',
  'kctcs': 'KCTCS',
  'kentucky community and technical college system': 'KCTCS',
  'centre college': 'Centre College',
  'berea college': 'Berea College',
  'university of cincinnati': 'University of Cincinnati',
  // School systems
  'jcps': 'Jefferson County Public Schools',
  'jefferson county public schools': 'Jefferson County Public Schools',
  'jefferson co public schools': 'Jefferson County Public Schools',
  'fcps': 'Fayette County Public Schools',
  'fayette county public schools': 'Fayette County Public Schools',
  // Local government
  'lfucg': 'LFUCG',
  'lexington fayette urban county government': 'LFUCG',
  'lexington-fayette urban county government': 'LFUCG',
  'louisville metro government': 'Louisville Metro Government',
  'louisville metro': 'Louisville Metro Government',
  'metro government': 'Louisville Metro Government',
  'louisville metro council': 'Louisville Metro Council',
  'jefferson county attorney’s office': "Jefferson County Attorney's Office",
  "jefferson county attorney's office": "Jefferson County Attorney's Office",
  'jefferson county attorneys office': "Jefferson County Attorney's Office",
  'jefferson county attorney office': "Jefferson County Attorney's Office",
  'jefferson county attorney': "Jefferson County Attorney's Office",
  'jeff. co. attorneys office': "Jefferson County Attorney's Office",
  'jeff co attorneys office': "Jefferson County Attorney's Office",
  'jcao': "Jefferson County Attorney's Office",
  'city of covington': 'City of Covington',
  'boone county': 'Boone County',
  'kenton county': 'Kenton County',
  // Healthcare
  'humana': 'Humana',
  'norton healthcare': 'Norton Healthcare',
  'norton': 'Norton Healthcare',
  'norton hospital': 'Norton Healthcare',
  'baptist health': 'Baptist Health',
  'baptist healthcare': 'Baptist Health',
  'pikeville medical center': 'Pikeville Medical Center',
  'owensboro health': 'Owensboro Health',
  'st. elizabeth healthcare': 'St. Elizabeth Healthcare',
  'st elizabeth healthcare': 'St. Elizabeth Healthcare',
  'st. elizabeth': 'St. Elizabeth Healthcare',
  'atria senior living': 'Atria Senior Living',
  // Law firms (post-suffix-strip forms)
  'frost brown todd': 'Frost Brown Todd',
  'morgan & morgan': 'Morgan & Morgan',
  'morgan and morgan': 'Morgan & Morgan',
  'stites & harbison': 'Stites & Harbison',
  'stites and harbison': 'Stites & Harbison',
  'stoll keenon ogden': 'Stoll Keenon Ogden',
  'mcbrayer': 'McBrayer',
  'dinsmore & shohl': 'Dinsmore & Shohl',
  'dinsmore and shohl': 'Dinsmore & Shohl',
  'dinsmore': 'Dinsmore & Shohl',
  'dbl law': 'DBL Law',
  'wyatt tarrant & combs': 'Wyatt, Tarrant & Combs',
  'wyatt tarrant and combs': 'Wyatt, Tarrant & Combs',
  'wyatt, tarrant & combs': 'Wyatt, Tarrant & Combs',
  // Companies
  'ups': 'UPS',
  'united parcel service': 'UPS',
  'churchill downs': 'Churchill Downs',
  'churchill downs inc': 'Churchill Downs',
  'kroger': 'Kroger',
  'the kroger company': 'Kroger',
  'kroger company': 'Kroger',
  'toyota': 'Toyota',
  'toyota motor manufacturing': 'Toyota',
  'toyota motor manufacturing kentucky': 'Toyota',
  'tmmk': 'Toyota',
  'amazon': 'Amazon',
  'amazon.com': 'Amazon',
  'walmart': 'Walmart',
  'wal-mart': 'Walmart',
  'ford': 'Ford Motor Company',
  'ford motor company': 'Ford Motor Company',
  'ford motor co': 'Ford Motor Company',
  'ge appliances': 'GE Appliances',
  'ge': 'GE Appliances',
  'general electric': 'GE Appliances',
  'brown forman': 'Brown-Forman',
  'brown-forman': 'Brown-Forman',
  'lexmark': 'Lexmark',
  'lexmark international': 'Lexmark',
  'state farm': 'State Farm',
  'state farm insurance': 'State Farm',
  'usps': 'USPS',
  'us postal service': 'USPS',
  'united states postal service': 'USPS',
  'us army': 'U.S. Army',
  'u.s. army': 'U.S. Army',
  'kentucky farm bureau': 'Kentucky Farm Bureau',
  'ky farm bureau': 'Kentucky Farm Bureau',
  'kentucky farm bureau insurance': 'Kentucky Farm Bureau',
  'republic bank': 'Republic Bank',
  'republic bank & trust': 'Republic Bank',
  'independence bank': 'Independence Bank',
  'forcht bank': 'Forcht Bank',
  'forcht group': 'Forcht Group',
  'central bank': 'Central Bank',
  'central bank & trust': 'Central Bank',
  'central bank and trust': 'Central Bank',
  'community trust bank': 'Community Trust Bank',
  'traditional bank': 'Traditional Bank',
  'planters bank': 'Planters Bank',
  'edward jones': 'Edward Jones',
  'alliance coal': 'Alliance Coal',
  'alliance resource partners': 'Alliance Coal',
  'ball homes': 'Ball Homes',
  'codell construction': 'Codell Construction',
  'palmer engineering': 'Palmer Engineering',
  'houchens insurance group': 'Houchens Insurance Group',
  'houchens industries': 'Houchens Industries',
  'mccarthy strategic solutions': 'McCarthy Strategic Solutions',
  'mt. brilliant farm': 'Mt. Brilliant Farm',
  'mt brilliant farm': 'Mt. Brilliant Farm',
  'keeneland': 'Keeneland',
  'keeneland association': 'Keeneland',
  'remax': 'RE/MAX',
  're/max': 'RE/MAX',
  'lg&e': 'LG&E and KU Energy',
  'lge': 'LG&E and KU Energy',
  'lg&e and ku': 'LG&E and KU Energy',
  'lg&e and ku energy': 'LG&E and KU Energy',
  'louisville gas & electric': 'LG&E and KU Energy',
  'louisville gas and electric': 'LG&E and KU Energy',
  'kentucky utilities': 'LG&E and KU Energy',
  'louisville free public library': 'Louisville Free Public Library',
  'xerox': 'Xerox',
  'yum brands': 'Yum! Brands',
  'yum! brands': 'Yum! Brands',
  'papa johns': "Papa John's",
  "papa john's": "Papa John's",
};

/** Strip trailing corporate suffixes so "frost brown todd llc" == "frost brown todd". */
const SUFFIX_RE = /[,.]?\s+(llc|llp|pllc|plc|psc|p\.s\.c\.?|inc\.?|incorporated|co\.|corp\.?|corporation|company|ltd\.?)$/i;

const collapse = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Normalize a raw employer string.
 * Returns null when the value is empty/junk (excluded from employer aggregation),
 * otherwise { key, display } where key is the grouping key and display is the
 * canonical (aliased) or cleaned-up raw form.
 */
export function normalizeEmployer(raw) {
  let value = String(raw || '').trim();
  if (!value) return null;
  let base = collapse(value);
  if (EMPTY_EMPLOYER_VALUES.has(base)) return null;
  // Punctuation-only placeholders ("--", "-", "...", "?") aren't employers.
  if (!/[a-z0-9]/.test(base)) return null;

  // "Self Employed, X" compounds — the real employer is X.
  const m = value.match(/^self[\s-]*employed\s*[,:-]\s*(.+)$/i);
  if (m) {
    value = m[1].trim();
    base = collapse(value);
    if (!base || EMPTY_EMPLOYER_VALUES.has(base)) return null;
  }

  // Direct alias on the raw collapsed form first (catches "churchill downs inc").
  if (EMPLOYER_ALIASES[base]) {
    const display = EMPLOYER_ALIASES[base];
    return { key: collapse(display), display };
  }

  // Strip one corporate suffix and retry the alias map.
  const stripped = base.replace(SUFFIX_RE, '').trim();
  if (stripped && EMPLOYER_ALIASES[stripped]) {
    const display = EMPLOYER_ALIASES[stripped];
    return { key: collapse(display), display };
  }

  const key = stripped || base;
  return { key, display: value };
}
