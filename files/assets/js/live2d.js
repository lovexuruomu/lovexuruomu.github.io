((doc) => {
  const script = doc.createElement('script')
  script.type = 'text/javascript'
  script.src = '/lib/L2Dwidget.min.js'

  const faceScript = [
    [5, 12, '上午好， 主人'],
    [12, 18, '下午好，主人'],
    [18, 22, '晚上好，主人'],
    [22, 24, '夜深了，主人'],
    [0, 5, '哦豁，主人，好困呐']
  ]

  script.onload = function () {
    const hours = new Date().getHours()
    const faceTip = faceScript.find(([start, end]) => hours >= start && hours < end).at(-1)
    L2Dwidget
      .on('*', (name) => {
        console.log('%c EVENT ' + '%c -> ' + name, 'background: #222; color: yellow', 'background: #fff; color: #000')
      })
      .init({
        mobile: {
          show: false
        },
        dialog: {
          // 开启对话框
          enable: true,
          script: {
            // 每空闲 10 秒钟，显示一条一言
            'every idle 10s': '$hitokoto$',
            // 当触摸到星星图案
            'hover .live-poetry': '长风破浪会有时，直挂云帆济沧海。',
            // 当触摸到角色身体
            'tap body': '哎呀！别碰我！',
            // 当触摸到角色头部
            'tap face': faceTip
          }
        }
      });
  }
  doc.body.appendChild(script)
})(window.document)