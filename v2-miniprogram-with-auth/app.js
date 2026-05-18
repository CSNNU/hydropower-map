var pako = require('./utils/pako.min.js');

// Compressed data split into multiple files (base64 encoded gzip with dictionary encoding)
var CompressedData1 = require('./data/data1.js');
var CompressedData2 = require('./data/data2.js');
var CompressedData3 = require('./data/data3.js');
var CompressedData4 = require('./data/data4.js');
var CompressedDataList = [CompressedData1, CompressedData2, CompressedData3, CompressedData4];

App({
  globalData: {
    allStations: [],
    userLat: null,
    userLng: null,
    nearbyRadius: 50,
    dataReady: false,
    authorized: false,
    phone: '',
    // Dictionaries for decoding
    provinces: [],
    cities: [],
    counties: []
  },

  checkAuth() {
    // 检查是否已授权
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
    // 权限检查 - 未授权跳转到登录页
    if (!this.checkAuth()) {
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return;
    }

    var self = this;
    console.log('[App] Decompressing data...');

    // Show loading immediately
    wx.showLoading({ title: '数据加载中...', mask: true });

    // Use setTimeout to yield to UI thread
    setTimeout(function() {
      try {
        var allRawStations = [];
        var dicts = null;

        // Decompress each chunk
        for (var d = 0; d < CompressedDataList.length; d++) {
          var buffer = wx.base64ToArrayBuffer(CompressedDataList[d]);
          var bytes = new Uint8Array(buffer);
          var decompressed = pako.ungzip(bytes, { to: 'string' });
          var rawData = JSON.parse(decompressed);

          // Store dictionaries from first chunk
          if (!dicts) {
            dicts = rawData;
            self.globalData.provinces = rawData.p || [];
            self.globalData.cities = rawData.c || [];
            self.globalData.counties = rawData.q || [];
            self.globalData.types = rawData.t || [];
            self.globalData.attrs = rawData.a || [];
          }

          // Collect stations from this chunk
          var s = rawData.s || [];
          for (var i = 0; i < s.length; i++) {
            allRawStations.push(s[i]);
          }
        }

        console.log('[App] Total raw stations:', allRawStations.length);

        // Decode all stations
        var stations = [];
        for (var i = 0; i < allRawStations.length; i++) {
          var station = allRawStations[i];
          // Coords are * 1000000 for 6 decimal places
          var damLat = station[5] ? station[5] / 1000000 : null;
          var damLng = station[6] ? station[6] / 1000000 : null;
          var factoryLat = station[7] ? station[7] / 1000000 : null;
          var factoryLng = station[8] ? station[8] / 1000000 : null;
          // Primary coords for map: factory if available, else dam
          var lat = factoryLat || damLat;
          var lng = factoryLng || damLng;
          // Capacity is * 10
          var capacity = station[10] ? station[10] / 10 : '';
          stations.push({
            id: String(station[0]),
            name: station[1] || '',
            province: self.globalData.provinces[station[2]] || '',
            city: self.globalData.cities[station[3]] || '',
            county: self.globalData.counties[station[4]] || '',
            lat: lat,
            lng: lng,
            dam_lat: damLat,
            dam_lng: damLng,
            factory_lat: factoryLat,
            factory_lng: factoryLng,
            type: self.globalData.types[station[9]] || '',
            capacity: capacity,
            attr: self.globalData.attrs[station[11]] || '',
            contact: station[12] || '',
            phone: station[13] || ''
          });
        }

        console.log('[App] Decompressed ' + stations.length + ' stations');
        console.log('[App] First station:', stations[0]);

        self.globalData.allStations = stations;
        self.globalData.dataReady = true;

        wx.hideLoading();

        if (self._onDataReady) self._onDataReady();

      } catch (e) {
        wx.hideLoading();
        console.error('[App] Failed to decompress data:', e);
      }
    }, 100);
  },

  onDataLoadedWithLocation(lat, lng) {
    this.globalData.userLat = lat;
    this.globalData.userLng = lng;
    console.log('[App] Location: ' + lat.toFixed(4) + ', ' + lng.toFixed(4));
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
