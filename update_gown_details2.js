const fs = require('fs');
let content = fs.readFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', 'utf8');

// 3. Modify allowedTimes to use shopHours
content = content.replace(
  /const allowedTimes = useMemo\(\(\) => \{\n    const times = \[\]\n    for \(let minutes = BUSINESS_OPEN_MINUTES; minutes <= BUSINESS_CLOSE_MINUTES; minutes \+= INTERVAL_MINUTES\) \{\n      times\.push\(minutesToTimeString\(minutes\)\)\n    \}\n    return times\n  \}, \[\]\)/,
  `// Calculate dynamic business hours from shop settings
  const businessHours = useMemo(() => {
    const openParts = shopHours.openingTime.split(':')
    const closeParts = shopHours.closingTime.split(':')
    const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1])
    const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1])
    return { openMinutes, closeMinutes }
  }, [shopHours.openingTime, shopHours.closingTime])

  const allowedTimes = useMemo(() => {
    const times = []
    for (let minutes = businessHours.openMinutes; minutes <= businessHours.closeMinutes; minutes += INTERVAL_MINUTES) {
      times.push(minutesToTimeString(minutes))
    }
    return times
  }, [businessHours])`
);

fs.writeFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', content);
console.log('Updated allowedTimes');
