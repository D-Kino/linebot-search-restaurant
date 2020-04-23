const templateMassage = {
  type: 'template',
  altText: '検索方法を指定',
  template: {
    type: 'buttons',
    title: '検索方法',
    text: '検索方法を選んで下さい。',
    actions: [{
        label: '詳しい条件を指定',
        type: 'uri',
        uri: module.parent.exports.liffUrl
      },
      {
        label: '今開いている店',
        type: 'postback',
        data: JSON.stringify({
          'lat': module.parent.exports.event.message.latitude,
          'lon': module.parent.exports.event.message.longitude
        }),
        displayText: 'now'
      }
    ],
  },
}

module.exports = templateMassage
