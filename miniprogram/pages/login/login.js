// 手机号白名单
var Whitelist = require('../../data/whitelist.js');

Page({
  data: {
    phone: '',
    loading: false,
    disabled: false,
    errorMsg: ''
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value,
      errorMsg: ''
    });
  },

  login() {
    var phone = this.data.phone.trim();

    if (!phone || phone.length !== 11) {
      this.setData({ errorMsg: '请输入正确的11位手机号' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ errorMsg: '手机号格式不正确' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    var self = this;
    setTimeout(function() {
      if (Whitelist.indexOf(phone) !== -1) {
        wx.setStorageSync('authorized', true);
        wx.setStorageSync('phone', phone);
        console.log('[Auth] Verified: ' + phone);
        wx.reLaunch({
          url: '/pages/index/index'
        });
      } else {
        self.setData({
          loading: false,
          errorMsg: '该手机号无使用权限，请联系管理员'
        });
        console.log('[Auth] Denied: ' + phone);
      }
    }, 500);
  }
});
