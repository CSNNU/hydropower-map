Page({
  data: {
    station: null
  },

  onLoad(options) {
    const app = getApp();
    var station = app.globalData.allStations.find(function(s) { return s.id === parseInt(options.id); });
    if (station) {
      this.setData({ station: station });
    }
  },

  makeCall() {
    wx.makePhoneCall({ phoneNumber: this.data.station.contact_phone });
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
  }
});
