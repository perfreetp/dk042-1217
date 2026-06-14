export default defineAppConfig({
  pages: [
    'pages/record/index',
    'pages/dashboard/index',
    'pages/category/index',
    'pages/budget/index',
    'pages/review/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#10B981',
    navigationBarTitleText: '轻记账',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#10B981',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/record/index',
        text: '记一笔'
      },
      {
        pagePath: 'pages/dashboard/index',
        text: '月度看板'
      },
      {
        pagePath: 'pages/category/index',
        text: '分类分析'
      },
      {
        pagePath: 'pages/budget/index',
        text: '预算提醒'
      },
      {
        pagePath: 'pages/review/index',
        text: '账单复盘'
      }
    ]
  }
})
