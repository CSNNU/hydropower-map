var pako = require('./utils/pako.min.js');

// 分包加载数据 - 不需要CDN
var SubData1 = require('./subpackage-data/data.js');
var SubData2 = require('./subpackage-data2/data.js');

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

    console.log('[App] 加载分包数据...');
    wx.showLoading({ title: '数据加载中...', mask: true });

    setTimeout(function() {
      try {
        var allRawStations = [];

        var buffer1 = wx.base64ToArrayBuffer(SubData1);
        var bytes1 = new Uint8Array(buffer1);
        var decompressed1 = pako.ungzip(bytes1, { to: 'string' });
        var rawData1 = JSON.parse(decompressed1);
        self.globalData.provinces = rawData1.p || [];
        self.globalData.cities = rawData1.c || [];
        self.globalData.counties = rawData1.q || [];
        self.globalData.types = rawData1.t || [];
        self.globalData.attrs = rawData1.a || [];
        var s1 = rawData1.s || [];
        for (var i = 0; i < s1.length; i++) {
          allRawStations.push(s1[i]);
        }

        var buffer2 = wx.base64ToArrayBuffer(SubData2);
        var bytes2 = new Uint8Array(buffer2);
        var decompressed2 = pako.ungzip(bytes2, { to: 'string' });
        var rawData2 = JSON.parse(decompressed2);
        var s2 = rawData2.s || [];
        for (var i = 0; i < s2.length; i++) {
          allRawStations.push(s2[i]);
        }

        console.log('[App] 总电站数:', allRawStations.length);

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

        console.log('[App] 解码完成', stations.length, '个电站');
        self.globalData.allStations = stations;
        self.globalData.dataReady = true;
        wx.hideLoading();
        if (self._onDataReady) self._onDataReady();
      } catch (e) {
        wx.hideLoading();
        console.error('[App] 数据加载失败:', e);
        wx.showModal({
          title: '数据加载失败',
          content: '错误: ' + e.message,
          showCancel: false
        });
      }
    }, 100);
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
