var pako = require('./utils/pako.min.js');

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
    provinces: [],
    cities: [],
    counties: [],
    types: [],
    attrs: []
  },

  onLaunch() {
    var self = this;
    console.log('[App] 加载数据...');
    wx.showLoading({ title: '数据加载中...', mask: true });

    setTimeout(function() {
      try {
        var allRawStations = [];
        var dicts = null;

        for (var d = 0; d < CompressedDataList.length; d++) {
          var buffer = wx.base64ToArrayBuffer(CompressedDataList[d]);
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
            attr: self.globalData.attrs[station[11]] || ''
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
          content: '错误: ' + (e.message || e),
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
