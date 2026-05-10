// Province-based progressive data loader for mini program
module.exports = {
  allStations: [],
  loadedProvinces: {},
  provinceIndex: null,
  loadingQueue: [],
  isLoading: false,

  // Initialize - load the index file first (small)
  init() {
    try {
      this.provinceIndex = require('./provinces/index.js');
      console.log('[DataLoader] Index loaded, ' + Object.keys(this.provinceIndex).length + ' provinces available');
    } catch (e) {
      console.error('[DataLoader] Failed to load index:', e);
      // Fallback: try loading all at once from old stations.js
      this.loadAllFallback();
    }
  },

  // Load nearby provinces first, then rest progressively
  loadByLocation(userLat, userLng) {
    if (!this.provinceIndex) return;

    var self = this;
    var provinces = Object.keys(this.provinceIndex);

    // Sort by distance from user location
    var sorted = provinces.map(function(p) {
      var info = self.provinceIndex[p];
      var dist = self.calcDistance(userLat, userLng, info.center_lat, info.center_lng);
      return { name: p, file: info.file, count: info.count, distance: dist };
    });
    sorted.sort(function(a, b) { return a.distance - b.distance; });

    console.log('[DataLoader] Loading order (by distance):');
    for (var i = 0; i < Math.min(10, sorted.length); i++) {
      console.log('  ' + (i+1) + '. ' + sorted[i].name + ' (' + sorted[i].distance.toFixed(0) + 'km, ' + sorted[i].count + ' stations)');
    }

    // Load first batch immediately (closest 5 provinces or ~3000 stations)
    var loaded = 0;
    for (var i = 0; i < sorted.length && loaded < 3000; i++) {
      this.loadProvince(sorted[i].name, sorted[i].file);
      loaded += sorted[i].count;
    }

    // Load remaining provinces progressively in background
    var startIdx = i;
    if (startIdx < sorted.length) {
      console.log('[DataLoader] Will load ' + (sorted.length - startIdx) + ' more provinces in background');
      this.loadingQueue = sorted.slice(startIdx);
      this.loadNextBatch();
    }
  },

  // Load a single province file
  loadProvince(name, fileName) {
    try {
      var stations = require('/data/provinces/' + fileName + '.js');
      this.allStations = this.allStations.concat(stations);
      this.loadedProvinces[name] = true;
      console.log('[DataLoader] Loaded ' + name + ': ' + stations.length + ' stations (total: ' + this.allStations.length + ')');
    } catch (e) {
      console.error('[DataLoader] Failed to load ' + name + ':', e);
    }
  },

  // Load next batch of provinces (background loading)
  loadNextBatch() {
    if (this.loadingQueue.length === 0) {
      this.isLoading = false;
      console.log('[DataLoader] All provinces loaded. Total: ' + this.allStations.length);
      return;
    }

    // Load up to 3 provinces per batch
    var batchSize = Math.min(3, this.loadingQueue.length);
    for (var i = 0; i < batchSize; i++) {
      var item = this.loadingQueue.shift();
      this.loadProvince(item.name, item.file);
    }

    // Continue loading after a short delay to avoid blocking UI
    setTimeout(this.loadNextBatch.bind(this), 100);
  },

  // Fallback: load all from old stations.js format
  loadAllFallback() {
    try {
      var raw = require('./stations.js');
      this.allStations = raw;
      console.log('[DataLoader] Fallback loaded ' + this.allStations.length + ' stations');
    } catch (e) {
      console.error('[DataLoader] Fallback also failed:', e);
    }
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
  },

  // Get total available station count (from index, without loading)
  getTotalAvailable() {
    if (!this.provinceIndex) return 0;
    var total = 0;
    Object.keys(this.provinceIndex).forEach(function(p) {
      total += this.provinceIndex[p].count;
    }.bind(this));
    return total;
  }
};
