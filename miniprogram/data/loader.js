// Simple data loader - all data is pre-loaded in memory
module.exports = {
  allStations: [],
  provinceIndex: null,

  // Get stations near a location
  getNearbyStations(lat, lng, radius) {
    var self = this;
    var nearby = [];
    for (var i = 0; i < self.allStations.length; i++) {
      var s = self.allStations[i];
      var sLat = s.lat || s.la;
      var sLng = s.lng || s.ln;
      if (!sLat || !sLng) continue;
      var dist = self.calcDistance(lat, lng, sLat, sLng);
      if (dist <= radius) {
        nearby.push({ station: s, distance: dist });
      }
    }
    nearby.sort(function(a, b) { return a.distance - b.distance; });
    return nearby;
  },

  // Haversine distance calculation
  calcDistance(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2)
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
};
