var DataLoader = require('data/loader.js');

App({
  globalData: {
    allStations: [],
    userLat: null,
    userLng: null,
    nearbyRadius: 50,
    dataLoader: null,
    dataReady: false
  },

  onLaunch() {
    // Initialize progressive data loader
    this.globalData.dataLoader = DataLoader;
    DataLoader.init();

    // If index loaded but no location yet, load a default set (top provinces by count)
    if (DataLoader.provinceIndex && !this.globalData.userLat) {
      console.log('[App] No location yet, loading top provinces...');
      var self = this;
      setTimeout(function() {
      // Load the 3 largest provinces as initial data (by file name from index)
      DataLoader.loadProvince('广东省', 'p11');
      DataLoader.loadProvince('福建省', 'p24');
      DataLoader.loadProvince('湖南省', 'p22');
        self.globalData.allStations = DataLoader.allStations;
        self.globalData.dataReady = true;
        console.log('[App] Initial load complete: ' + self.globalData.allStations.length + ' stations');

        // Notify pages that data is ready
        if (self._onDataReady) {
          self._onDataReady();
        }
      }, 100);
    }
  },

  // Called when user location is obtained - trigger progressive loading
  onDataLoadedWithLocation(lat, lng) {
    this.globalData.userLat = lat;
    this.globalData.userLng = lng;

    if (DataLoader.provinceIndex && DataLoader.allStations.length === 0) {
      console.log('[App] Loading data based on location: ' + lat.toFixed(4) + ', ' + lng.toFixed(4));
      var self = this;
      DataLoader.loadByLocation(lat, lng);

      // Wait for initial batch to complete
      setTimeout(function() {
        self.globalData.allStations = DataLoader.allStations;
        self.globalData.dataReady = true;
        console.log('[App] Location-based load: ' + self.globalData.allStations.length + ' stations');
        if (self._onDataReady) {
          self._onDataReady();
        }
      }, 500);
    }
  },

  // Register callback for when data becomes ready
  onDataReady(callback) {
    this._onDataReady = callback;
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
