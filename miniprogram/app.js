App({
  globalData: {
    allStations: [],
    userLat: null,
    userLng: null,
    nearbyRadius: 50
  },

  onLaunch() {
    // Load station data using require (synchronous, works for local JSON)
    try {
      const raw = require('data/stations.js');
      this.globalData.allStations = raw.map(function(s) {
        return {
          id: s.id,
          name: s.name || s.n,
          lat: parseFloat(s.lat || s.la),
          lng: parseFloat(s.lng || s.ln),
          capacity: (parseFloat(s.capacity || s.cap) + ' kW'),
          type: s.type || s.t || '',
          province: s.province || s.p || '',
          city: s.city || s.c || '',
          county: s.county || s.q || '',
          contact_name: s.contact_name || '',
          contact_phone: s.contact_phone || ''
        };
      });
      console.log('Loaded ' + this.globalData.allStations.length + ' stations');
    } catch (e) {
      console.error('Failed to load station data:', e);
    }
  },

  calcDistance(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2)
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
});
