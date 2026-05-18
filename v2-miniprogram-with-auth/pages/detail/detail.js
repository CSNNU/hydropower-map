Page({
  data: {
    station: null
  },

  onLoad(options) {
    const app = getApp();
    var station = app.globalData.allStations.find(function(s) { return String(s.id) === String(options.id); });
    if (station) {
      // Format for display
      station.latStr = station.lat ? station.lat.toFixed(4) : '未知';
      station.lngStr = station.lng ? station.lng.toFixed(4) : '未知';
      station.capacityStr = station.capacity ? station.capacity + ' kW' : '未知';
      station.typeStr = station.type || '未知';
      station.attrStr = station.attr || '未知';
      station.contactStr = station.contact || '未知';
      station.phoneStr = station.phone || '未知';
      station.damLatStr = station.dam_lat ? station.dam_lat.toFixed(4) : '未知';
      station.damLngStr = station.dam_lng ? station.dam_lng.toFixed(4) : '未知';
      station.factoryLatStr = station.factory_lat ? station.factory_lat.toFixed(4) : '未知';
      station.factoryLngStr = station.factory_lng ? station.factory_lng.toFixed(4) : '未知';
      station.provinceStr = station.province || '未知';
      station.cityStr = station.city || '未知';
      station.countyStr = station.county || '未知';
      this.setData({ station: station });
    }
  },

  makeCall() {
    wx.makePhoneCall({ phoneNumber: this.data.station.phone });
  },

  navigateToStation() {
    var s = this.data.station;
    wx.openLocation({
      latitude: s.lat,
      longitude: s.lng,
      name: s.name,
      address: s.province + ' ' + s.city + ' ' + s.county,
      scale: 15
    });
  },

  navigateToDam() {
    var s = this.data.station;
    wx.openLocation({
      latitude: s.dam_lat,
      longitude: s.dam_lng,
      name: s.name + ' (坝址)',
      address: s.province + ' ' + s.city + ' ' + s.county,
      scale: 15
    });
  },

  navigateToFactory() {
    var s = this.data.station;
    wx.openLocation({
      latitude: s.factory_lat,
      longitude: s.factory_lng,
      name: s.name + ' (厂房)',
      address: s.province + ' ' + s.city + ' ' + s.county,
      scale: 15
    });
  }
});
