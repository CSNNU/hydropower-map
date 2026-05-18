Page({
  data: {
    markers: [],
    userMarker: null,
    filteredStations: [],
    nearbyCount: 0,
    totalCount: 0,
    showFilter: false,
    searchInput: '',
    provinceList: [],
    cityList: [],
    countyList: [],
    selectedProvince: '',
    selectedCity: '',
    selectedCounty: '',
    radius: 50,
    showDetail: false,
    detailStation: null,
    locText: '未定位',
    locActive: false,
    userLat: null,
    userLng: null,
    loading: true,
    loadedCount: 0
  },

  onLoad() {
    // 权限检查
    if (!getApp().checkAuth()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const app = getApp();
    this.refreshData();

    // Register callback for when data becomes ready/updated
    app.onDataReady(() => {
      this.refreshData();
    });

    // Auto locate user on load
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.userLat = res.latitude;
        app.globalData.userLng = res.longitude;
        this.setData({
          locText: '已定位 (' + res.latitude.toFixed(4) + ', ' + res.longitude.toFixed(4) + ')',
          locActive: true,
          userLat: res.latitude,
          userLng: res.longitude
        });

        // Trigger progressive loading based on location
        app.onDataLoadedWithLocation(res.latitude, res.longitude);

        this.drawNearby();
      },
      fail: (err) => {
        console.log('Auto locate failed:', err);
        this.setData({ locText: '定位失败，请点击获取位置' });
      }
    });
  },

  onReady() {
    this.mapCtx = wx.createMapContext('stationMap');
  },

  // Refresh data from app globalData (called when data loads/updates)
  refreshData() {
    const app = getApp();
    var allStations = app.globalData.allStations;

    if (!allStations || allStations.length === 0) return;

    // Build province list
    var provinces = [];
    allStations.forEach(function(s) {
      if (s.province && provinces.indexOf(s.province) === -1) provinces.push(s.province);
    });
    provinces.sort();

    this.setData({
      totalCount: allStations.length,
      filteredStations: allStations.slice(),
      provinceList: provinces,
      loading: false,
      loadedCount: allStations.length
    });
  },

  // Get user location manually
  locateUser() {
    const app = getApp();
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        app.globalData.userLat = res.latitude;
        app.globalData.userLng = res.longitude;
        this.setData({
          locText: '已定位 (' + res.latitude.toFixed(4) + ', ' + res.longitude.toFixed(4) + ')',
          locActive: true,
          userLat: res.latitude,
          userLng: res.longitude,
          userMarker: {
            id: 0,
            latitude: res.latitude,
            longitude: res.longitude,
            iconPath: '/images/user.png',
            width: 30,
            height: 30,
            callout: {
              content: '我的位置',
              display: 'ALWAYS',
              borderRadius: 8,
              padding: 6,
              fontSize: 12,
              bgColor: '#e74c3c',
              color: '#fff'
            }
          }
        });
        this.mapCtx.moveToLocation();
        this.drawNearby();
      },
      fail: (err) => {
        wx.showToast({ title: '定位失败：' + err.errMsg, icon: 'none' });
        this.setData({ locText: '定位失败', locActive: false });
      }
    });
  },

  // Draw nearby stations on map
  drawNearby() {
    const app = getApp();
    if (app.globalData.userLat === null) return;

    var markers = [];
    var count = 0;
    var radius = this.data.radius;

    this.data.filteredStations.forEach(function(s, idx) {
      var dist = app.calcDistance(app.globalData.userLat, app.globalData.userLng, s.lat, s.lng);
      if (dist <= radius) {
        count++;
        markers.push({
          id: parseInt(s.id) || idx + 1,
          latitude: s.lat,
          longitude: s.lng,
          iconPath: '/images/station.png',
          width: 24,
          height: 24,
          callout: {
            content: s.name + '\n' + s.province + ' ' + s.city + ' ' + s.county + '\n' + (s.capacity ? s.capacity + 'kW ' : '') + (s.type ? s.type : '') + '\n' + dist.toFixed(1) + 'km',
            display: 'BYCLICK',
            borderRadius: 8,
            padding: 6,
            fontSize: 12,
            bgColor: '#fff',
            color: '#333'
          }
        });
      }
    });

    // Add user marker
    if (app.globalData.userLat) {
      markers.push({
        id: 0,
        latitude: app.globalData.userLat,
        longitude: app.globalData.userLng,
        iconPath: '/images/user.png',
        width: 30,
        height: 30,
        callout: {
          content: '我的位置',
          display: 'ALWAYS',
          borderRadius: 8,
          padding: 6,
          fontSize: 12,
          bgColor: '#e74c3c',
          color: '#fff'
        }
      });
    }

    this.setData({ markers: markers, nearbyCount: count });
  },

  // Map marker tap
  onMarkerTap(e) {
    var markerId = e.markerId;
    if (markerId === 0) return; // user location

    const app = getApp();
    // Convert markerId to string for comparison (data id is string)
    var station = app.globalData.allStations.find(function(s) { return String(s.id) === String(markerId); });
    console.log('[MarkerTap] markerId:', markerId, 'station:', station);
    if (!station) return;

    var dist = app.calcDistance(app.globalData.userLat, app.globalData.userLng, station.lat, station.lng);

    // Format for display
    var detailStation = Object.assign({}, station, {
      distance: dist.toFixed(1),
      latStr: station.lat ? station.lat.toFixed(4) : '未知',
      lngStr: station.lng ? station.lng.toFixed(4) : '未知',
      capacityStr: station.capacity ? station.capacity + ' kW' : '未知',
      typeStr: station.type || '未知',
      attrStr: station.attr || '未知',
      damLatStr: station.dam_lat ? station.dam_lat.toFixed(4) : '未知',
      damLngStr: station.dam_lng ? station.dam_lng.toFixed(4) : '未知',
      factoryLatStr: station.factory_lat ? station.factory_lat.toFixed(4) : '未知',
      factoryLngStr: station.factory_lng ? station.factory_lng.toFixed(4) : '未知',
      provinceStr: station.province || '未知',
      cityStr: station.city || '未知',
      countyStr: station.county || '未知'
    });

    this.setData({
      showDetail: true,
      detailStation: detailStation
    });
    console.log('[MarkerTap] detailStation:', this.data.detailStation);
  },

  // Close detail panel
  closeDetail() {
    this.setData({ showDetail: false, detailStation: null });
  },

  // Toggle filter panel
  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // Search input change
  onSearchInput(e) {
    this.setData({ searchInput: e.detail.value });
  },

  // Province picker change
  onProvinceChange(e) {
    var idx = parseInt(e.detail.value);
    var province = this.data.provinceList[idx] || '';
    this.setData({ selectedProvince: province, selectedCity: '', selectedCounty: '' });

    // Build city list for selected province
    var cities = [];
    const app = getApp();
    if (province) {
      app.globalData.allStations.forEach(function(s) {
        if (s.province === province && s.city && cities.indexOf(s.city) === -1) cities.push(s.city);
      });
    }
    cities.sort();
    this.setData({ cityList: cities, countyList: [] });

    // Apply filter
    this.applyFilters();
  },

  // City picker change
  onCityChange(e) {
    var idx = parseInt(e.detail.value);
    var city = this.data.cityList[idx] || '';
    var self = this;
    this.setData({ selectedCity: city, selectedCounty: '' });

    // Build county list for selected city
    var counties = [];
    const app = getApp();
    if (city) {
      app.globalData.allStations.forEach(function(s) {
        if (s.province === self.data.selectedProvince && s.city === city && s.county && counties.indexOf(s.county) === -1) counties.push(s.county);
      });
    }
    counties.sort();
    this.setData({ countyList: counties });

    // Apply filter
    this.applyFilters();
  },

  // County picker change
  onCountyChange(e) {
    var idx = parseInt(e.detail.value);
    var county = this.data.countyList[idx] || '';
    this.setData({ selectedCounty: county });
    this.applyFilters();
  },

  // Apply all filters
  applyFilters() {
    const app = getApp();
    var keyword = this.data.searchInput.trim().toLowerCase();
    var province = this.data.selectedProvince;
    var city = this.data.selectedCity;
    var county = this.data.selectedCounty;

    var filtered = app.globalData.allStations.filter(function(s) {
      if (keyword && s.name.toLowerCase().indexOf(keyword) === -1) return false;
      if (province && s.province !== province) return false;
      if (city && s.city !== city) return false;
      if (county && s.county !== county) return false;
      return true;
    });

    this.setData({ filteredStations: filtered });
    this.drawNearby();
  },

  // Search button click
  doSearch() {
    this.applyFilters();
    wx.showToast({ title: '找到 ' + this.data.filteredStations.length + ' 个电站', icon: 'none' });
  },

  // Clear filters
  clearFilter() {
    this.setData({
      searchInput: '',
      selectedProvince: '',
      selectedCity: '',
      selectedCounty: '',
      cityList: [],
      countyList: []
    });
    const app = getApp();
    this.setData({ filteredStations: app.globalData.allStations.slice() });
    this.drawNearby();
  },

  // Radius input change
  onRadiusInput(e) {
    var val = parseInt(e.detail.value);
    if (val >= 1 && val <= 1000) {
      this.setData({ radius: val });
    }
  },

  // Apply radius
  applyRadius() {
    getApp().globalData.nearbyRadius = this.data.radius;
    this.drawNearby();
    wx.showToast({ title: '半径已更新为 ' + this.data.radius + 'km', icon: 'none' });
  },

  // Reset map view
  resetMap() {
    this.setData({
      markers: [],
      userMarker: null,
      nearbyCount: 0
    });
    wx.showToast({ title: '地图已重置', icon: 'none' });
  },

  // Navigate to dam
  navigateToDam(e) {
    var lat = e.currentTarget.dataset.lat;
    var lng = e.currentTarget.dataset.lng;
    var s = this.data.detailStation;
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: s.name + ' (坝址)',
      address: s.province + ' ' + s.city + ' ' + s.county,
      scale: 15
    });
  },

  // Navigate to factory
  navigateToFactory(e) {
    var lat = e.currentTarget.dataset.lat;
    var lng = e.currentTarget.dataset.lng;
    var s = this.data.detailStation;
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: s.name + ' (厂房)',
      address: s.province + ' ' + s.city + ' ' + s.county,
      scale: 15
    });
  },

  // No-op function to prevent event bubbling
  noop: function() {}
});
