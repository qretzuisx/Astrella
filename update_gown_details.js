const fs = require('fs');
let content = fs.readFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', 'utf8');

// 2. Update the fetchGown useEffect to also fetch shop hours
content = content.replace(
  /if \(data\.success && data\.gown\) \{\n          setGown\(data\.gown\)\n        \}/,
  `if (data.success && data.gown) {
          setGown(data.gown)

          // Fetch shop operating hours from the owner
          const ownerId = typeof data.gown.owner === 'object' ? data.gown.owner._id : data.gown.owner
          if (ownerId) {
            try {
              const shopResponse = await fetch(\`\${API_URL}/user/operating-hours/\${ownerId}\`)
              const shopData = await shopResponse.json()
              if (shopData.success && shopData.operatingHours) {
                setShopHours({
                  openingTime: shopData.operatingHours.openingTime || '09:00',
                  closingTime: shopData.operatingHours.closingTime || '19:00',
                  availableDays: shopData.operatingHours.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                })
              }
            } catch (shopError) {
              console.error('Error fetching shop hours:', shopError)
            }
          }
        }`
);

fs.writeFileSync('C:/Users/HP/Astrella/frontend/src/pages/GownDetails.jsx', content);
console.log('Updated fetchGown');
