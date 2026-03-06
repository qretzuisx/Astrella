const fs = require('fs');
let content = fs.readFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', 'utf8');

// 4. Update normalizeTimeInput to use dynamic hours
content = content.replace(
  /if \(totalMinutes < BUSINESS_OPEN_MINUTES\) \{\n    return \{ valid: true, time: minutesToTimeString\(BUSINESS_OPEN_MINUTES\), autoAdjusted: true \}\n  \}\n\n  if \(totalMinutes > BUSINESS_CLOSE_MINUTES\) \{\n    return \{ valid: true, time: minutesToTimeString\(BUSINESS_CLOSE_MINUTES\), autoAdjusted: true \}\n  \}\n\n  const remainder = totalMinutes % INTERVAL_MINUTES\n  if \(remainder !== 0\) \{\n    const roundedUp = totalMinutes \+ \(INTERVAL_MINUTES - remainder\)\n    const roundedDown = totalMinutes - remainder\n    totalMinutes = roundedUp <= BUSINESS_CLOSE_MINUTES \? roundedUp : roundedDown\n    return \{ valid: true, time: minutesToTimeString\(totalMinutes\), autoAdjusted: true \}\n  \}/,
  `// Use dynamic shop hours (calculated at runtime via useMemo)
  // We'll reference businessHours in the component context`
);

fs.writeFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', content);
console.log('Updated normalizeTimeInput');
