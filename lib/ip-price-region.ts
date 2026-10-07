// Approximate KAMIS price region from Vercel's IP geolocation headers. No GPS or device location is
// used. Mobile carrier IPs are often placed in the capital area, so only the province/metro level
// (ISO 3166-2:KR subdivision) is trusted; a city name only refines a metro city.
const SUBDIVISIONS:Record<string,string>={
 '11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','50':'세종',
 '41':'경기','42':'강원','51':'강원','43':'충북','44':'충남','45':'전북','52':'전북','46':'전남','47':'경북','48':'경남','49':'제주',
};
const CITIES:Record<string,string>={seoul:'서울',busan:'부산',daegu:'대구',incheon:'인천',gwangju:'광주',daejeon:'대전',ulsan:'울산',sejong:'세종',jeju:'제주'};

export function priceRegionFromHeaders(headers:Headers):string|null{
 if(headers.get('x-vercel-ip-country')!=='KR')return null;
 const subdivision=headers.get('x-vercel-ip-country-region')?.trim().replace(/^KR-/i,'')??'';
 if(SUBDIVISIONS[subdivision])return SUBDIVISIONS[subdivision];
 let city='';
 try{city=decodeURIComponent(headers.get('x-vercel-ip-city')??'');}catch{/* malformed header */}
 return CITIES[city.trim().toLowerCase().replace(/(-si|-do)$/,'')]??null;
}
