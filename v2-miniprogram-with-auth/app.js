var pako = require('./utils/pako.min.js');

// 数据通过 CDN 下载，首次加载后缓存到本地
var DATA_CDN_BASE = 'https://cdn.jsdelivr.net/gh/CSNNU/hydropower-map@main/data-cdn/';
var DATA_CHUNKS = ['data1.js', 'data2.js', 'data3.js', 'data4.js'];
var CACHE_KEY = 'hydropower_stations_v2';

function tryLoadCache() {
  try {
    var cached = wx.getStorageSync(CACHE_KEY);
    if (cached && cached.stations && cached.stations.length > 0) {
      return cached;
    }
  } catch(e) {}
  return null;
}

function saveCache(stations, dicts) {
  try {
    wx.setStorageSync(CACHE_KEY, { stations: stations, dicts: dicts, time: Date.now() });
  } catch(e) {}
}

function fetchDataChunk(index) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: DATA_CDN_BASE + DATA_CHUNKS[index],
      timeout: 15000,
      success: function(res) {
        if (res.statusCode === 200) {
          var data = res.data;
          if (data.indexOf('module.exports') === 0) {
            data = data.replace(/^module\.exports\s*=\s*"/, '').replace(/";\s*$/, '');
          }
          resolve(data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: reject
    });
  });
}

function loadStations(self) {
  // 先尝试从缓存加载
  var cached = tryLoadCache();
  if (cached) {
    console.log('[App] 从缓存加载', cached.stations.length, '个电站');
    self.globalData.allStations = cached.stations;
    self.globalData.provinces = cached.dicts.p || [];
    self.globalData.cities = cached.dicts.c || [];
    self.globalData.counties = cached.dicts.q || [];
    self.globalData.types = cached.dicts.t || [];
    self.globalData.attrs = cached.dicts.a || [];
    self.globalData.dataReady = true;
    wx.hideLoading();
    if (self._onDataReady) self._onDataReady();
    return;
  }

  wx.showLoading({ title: '数据加载中...', mask: true });

  setTimeout(function() {
    Promise.all(DATA_CHUNKS.map(function(_, i) { return fetchDataChunk(i); }))
      .then(function(chunks) {
        var allRawStations = [];
        var dicts = null;

        for (var d = 0; d < chunks.length; d++) {
          var buffer = wx.base64ToArrayBuffer(chunks[d]);
          var bytes = new Uint8Array(buffer);
          var decompressed = pako.ungzip(bytes, { to: 'string' });
          var rawData = JSON.parse(decompressed);

          if (!dicts) {
            dicts = rawData;
            self.globalData.provinces = rawData.p || [];
            self.globalData.cities = rawData.c || [];
            self.globalData.counties = rawData.q || [];
            self.globalData.types = rawData.t || [];
            self.globalData.attrs = rawData.a || [];
          }

          var s = rawData.s || [];
          for (var i = 0; i < s.length; i++) {
            allRawStations.push(s[i]);
          }
        }

        var stations = [];
        for (var i = 0; i < allRawStations.length; i++) {
          var station = allRawStations[i];
          var damLat = station[5] ? station[5] / 1000000 : null;
          var damLng = station[6] ? station[6] / 1000000 : null;
          var factoryLat = station[7] ? station[7] / 1000000 : null;
          var factoryLng = station[8] ? station[8] / 1000000 : null;
          var lat = factoryLat || damLat;
          var lng = factoryLng || damLng;
          var capacity = station[10] ? station[10] / 10 : '';
          stations.push({
            id: String(station[0]),
            name: station[1] || '',
            province: self.globalData.provinces[station[2]] || '',
            city: self.globalData.cities[station[3]] || '',
            county: self.globalData.counties[station[4]] || '',
            lat: lat, lng: lng,
            dam_lat: damLat, dam_lng: damLng,
            factory_lat: factoryLat, factory_lng: factoryLng,
            type: self.globalData.types[station[9]] || '',
            capacity: capacity,
            attr: self.globalData.attrs[station[11]] || '',
            contact: station[12] || '',
            phone: station[13] || ''
          });
        }

        console.log('[App] 从 CDN 加载', stations.length, '个电站');
        self.globalData.allStations = stations;
        self.globalData.dataReady = true;

        saveCache(stations, dicts);

        wx.hideLoading();
        if (self._onDataReady) self._onDataReady();
      })
      .catch(function(e) {
        wx.hideLoading();
        console.error('[App] 数据加载失败:', e);
        wx.showModal({
          title: '数据加载失败',
          content: '请检查网络连接后重试',
          showCancel: false
        });
      });
  }, 100);
}

App({
  globalData: {
    allStations: [],
    userLat: null,
    userLng: null,
    nearbyRadius: 50,
    dataReady: false,
    authorized: false,
    phone: '',
    provinces: [],
    cities: [],
    counties: [],
    types: [],
    attrs: []
  },

  checkAuth() {
    var authorized = wx.getStorageSync('authorized');
    var phone = wx.getStorageSync('phone');
    if (authorized && phone) {
      this.globalData.authorized = true;
      this.globalData.phone = phone;
      return true;
    }
    return false;
  },

  onLaunch() {
    var self = this;

    if (!this.checkAuth()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    loadStations(this);
  },

  onDataLoadedWithLocation(lat, lng) {
    this.globalData.userLat = lat;
    this.globalData.userLng = lng;
    if (this._onDataReady) this._onDataReady();
  },

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
