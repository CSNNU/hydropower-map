var DataLoader = require('data/loader.js');

// Pre-define all province data modules (static requires resolved at compile time)
var ProvinceData = {
  'p01': require('data/provinces/p01.js'),
  'p02': require('data/provinces/p02.js'),
  'p03': require('data/provinces/p03.js'),
  'p04': require('data/provinces/p04.js'),
  'p05': require('data/provinces/p05.js'),
  'p06': require('data/provinces/p06.js'),
  'p07': require('data/provinces/p07.js'),
  'p08': require('data/provinces/p08.js'),
  'p09': require('data/provinces/p09.js'),
  'p10': require('data/provinces/p10.js'),
  'p11': require('data/provinces/p11.js'),
  'p12': require('data/provinces/p12.js'),
  'p13': require('data/provinces/p13.js'),
  'p14': require('data/provinces/p14.js'),
  'p15': require('data/provinces/p15.js'),
  'p16': require('data/provinces/p16.js'),
  'p17': require('data/provinces/p17.js'),
  'p18': require('data/provinces/p18.js'),
  'p19': require('data/provinces/p19.js'),
  'p20': require('data/provinces/p20.js'),
  'p21': require('data/provinces/p21.js'),
  'p22': require('data/provinces/p22.js'),
  'p23': require('data/provinces/p23.js'),
  'p24': require('data/provinces/p24.js'),
  'p25': require('data/provinces/p25.js'),
  'p26': require('data/provinces/p26.js'),
  'p27': require('data/provinces/p27.js'),
  'p28': require('data/provinces/p28.js'),
  'p29': require('data/provinces/p29.js'),
  'p30': require('data/provinces/p30.js'),
  'p31': require('data/provinces/p31.js'),
  'p32': require('data/provinces/p32.js')
};

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
        // Load the 3 largest provinces as initial data
        DataLoader.addStations('广东省', ProvinceData['p11']);
        DataLoader.addStations('福建省', ProvinceData['p24']);
        DataLoader.addStations('湖南省', ProvinceData['p22']);
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

      // Get sorted province list from loader, then load them using pre-defined modules
      var provinces = Object.keys(DataLoader.provinceIndex);
      var sorted = provinces.map(function(p) {
        var info = DataLoader.provinceIndex[p];
        var dist = DataLoader.calcDistance(lat, lng, info.center_lat, info.center_lng);
        return { name: p, file: info.file, count: info.count, distance: dist };
      });
      sorted.sort(function(a, b) { return a.distance - b.distance; });

      console.log('[App] Loading order (by distance):');
      for (var i = 0; i < Math.min(10, sorted.length); i++) {
        console.log('  ' + (i+1) + '. ' + sorted[i].name + ' (' + sorted[i].distance.toFixed(0) + 'km, ' + sorted[i].count + ' stations)');
      }

      // Load first batch immediately (closest provinces or ~3000 stations)
      var loaded = 0;
      for (var i = 0; i < sorted.length && loaded < 3000; i++) {
        DataLoader.addStations(sorted[i].name, ProvinceData[sorted[i].file]);
        loaded += sorted[i].count;
      }

      // Load remaining provinces progressively in background
      var startIdx = i;
      if (startIdx < sorted.length) {
        console.log('[App] Will load ' + (sorted.length - startIdx) + ' more provinces in background');
        this._loadRemaining(sorted.slice(startIdx));
      }

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

  // Background loading of remaining provinces
  _loadRemaining(queue) {
    if (!queue || queue.length === 0) {
      console.log('[App] All provinces loaded. Total: ' + DataLoader.allStations.length);
      return;
    }

    var self = this;
    var batchSize = Math.min(3, queue.length);
    for (var i = 0; i < batchSize; i++) {
      var item = queue.shift();
      DataLoader.addStations(item.name, ProvinceData[item.file]);
    }

    setTimeout(function() {
      self._loadRemaining(queue);
    }, 100);
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
