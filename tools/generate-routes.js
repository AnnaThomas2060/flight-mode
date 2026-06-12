// Generates src/data/routes.js from the OpenFlights database
// (https://github.com/jpatokal/openflights — data under ODbL; attribute in credits).
//
// Usage:
//   curl -sLO https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
//   curl -sLO https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat
//   node tools/generate-routes.js <airports.dat> <routes.dat>
//
// Durations are estimated from great-circle distance at ~750 km/h cruise
// plus 35 min of taxi/climb/descent overhead — close enough to real block
// times for a focus-session matcher.
const fs = require('fs');
const path = require('path');

const DEGREE_MIN = 30;   // keep airports with at least this many routes (majors)
const MIN_MINUTES = 30;  // drop micro-hops shorter than the shortest useful session
const CRUISE_KMH = 750;
const OVERHEAD_MIN = 35;

const [airportsFile, routesFile] = process.argv.slice(2);
if (!airportsFile || !routesFile) {
  console.error('usage: node generate-routes.js <airports.dat> <routes.dat>');
  process.exit(1);
}

// split a CSV line on commas not inside quotes
const splitCsv = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(f => f.replace(/^"|"$/g, ''));

// ---- airports: IATA -> { city, country, lat, lon, region } ----
const airports = new Map();
for (const line of fs.readFileSync(airportsFile, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const f = splitCsv(line);
  const [, , city, country, iata, , lat, lon, , , , tz] = f;
  if (!iata || iata === '\\N' || iata.length !== 3) continue;
  airports.set(iata, {
    city, country,
    lat: parseFloat(lat), lon: parseFloat(lon),
    region: (tz && tz !== '\\N' ? tz.split('/')[0] : country) || country
  });
}

// ---- routes: dedupe by src-dst, count degrees ----
const pairs = new Set();
const degree = new Map();
for (const line of fs.readFileSync(routesFile, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [, , src, , dst] = line.split(',');
  if (!airports.has(src) || !airports.has(dst) || src === dst) continue;
  const key = `${src}-${dst}`;
  if (pairs.has(key)) continue;
  pairs.add(key);
  degree.set(src, (degree.get(src) || 0) + 1);
  degree.set(dst, (degree.get(dst) || 0) + 1);
}

const haversineKm = (a, b) => {
  const rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const out = [];
for (const key of pairs) {
  const [src, dst] = key.split('-');
  if ((degree.get(src) || 0) < DEGREE_MIN || (degree.get(dst) || 0) < DEGREE_MIN) continue;
  const a = airports.get(src), b = airports.get(dst);
  const minutes = Math.round(haversineKm(a, b) / CRUISE_KMH * 60 + OVERHEAD_MIN);
  if (minutes < MIN_MINUTES) continue;
  out.push([src, a.city, dst, b.city, minutes]);
}
out.sort((x, y) => (x[0] + x[2]).localeCompare(y[0] + y[2]));

const header = `// Real-route reference data generated from the OpenFlights database
// (https://github.com/jpatokal/openflights), data under the Open Database
// License (ODbL) — credit OpenFlights in the app's credits screen.
// Regenerate with tools/generate-routes.js. typicalMinutes is estimated
// from great-circle distance (~${CRUISE_KMH} km/h + ${OVERHEAD_MIN} min overhead).
// ${out.length} routes between ${new Set(out.flatMap(r => [r[0], r[2]])).size} major airports.
// Compact tuples: [origin, originCity, destination, destinationCity, typicalMinutes].
const RAW = [
${out.map(r => JSON.stringify(r)).join(',\n')}
];

export default RAW.map(([origin, originCity, destination, destinationCity, typicalMinutes]) => ({
  id: \`\${origin}-\${destination}\`.toLowerCase(),
  origin, originCity, destination, destinationCity, typicalMinutes,
  weight: typicalMinutes >= 240 ? 2 : 1
}));
`;

const dest = path.join(__dirname, '..', 'src', 'data', 'routes.js');
fs.writeFileSync(dest, header);

const cities = new Set(out.map(r => r[1]));
const mins = out.map(r => r[4]);
console.log(`routes: ${out.length}, departure cities: ${cities.size}`);
console.log(`duration range: ${Math.min(...mins)}–${Math.max(...mins)} min`);
console.log(`wrote ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
