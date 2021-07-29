module.exports = {
  pages: [
    'pages/index/index'
  ],
  subPackages: [
    {
      root: "package",
      pages: [
        "index",
        "index2"
      ]
    },
    {
      root: "subpackage",
      pages: [
        "index"
      ]
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  }
}
