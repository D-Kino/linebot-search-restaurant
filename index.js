'use strict';
const express = require('express');
const util = require('util');
const app = express();
const line_bot_config = require('./config/line_bot_config.js');
const line = require('@line/bot-sdk');
const client = new line.Client(line_bot_config);
const yahoo_api_config = require('./config/yahoo_api_config.js');
const yahoo_api_config_json = JSON.parse(JSON.stringify(yahoo_api_config));

// LINE Botからのアクセスの一次処理。
app.post('/callback', line.middleware(line_bot_config), (req, res) => {
  Promise
  .all(req.body.events.map(handleEvent))
  .then((result) => res.json(result))
  .catch((err) => {
    console.error(err);
    res.status(500).end();
  });
});

// イベントに対する返答を記述する部分
function handleEvent(event) {
console.log(event.type)

  // ユーザーからBotにテキストが送られた場合以外は何もしない
  if ((event.type !== 'message' || (event.message.type !== 'location' && event.message.type !== 'text')) && event.type !== 'postback') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  if (event.type == 'message' && event.message.type == 'location') {
    // 位置情報受信時はLIFF URLに緯度経度をパラメータとして付与したものを返す
    var liffUrl = util.format('https://liff.line.me/1654122772-e95Ay5nr/?lat=%s&lon=%s', event.message.latitude, event.message.longitude);
    module.exports.liffUrl = liffUrl
    module.exports.event = event
    const templateMassage = require('./template/how_search.js');
    // 返信
    return client.replyMessage(event.replyToken, templateMassage);
  }
  else{
    var url
    if (event.type == 'postback') {
      var latlon = JSON.parse(event.postback.data)
      url = util.format('https://map.yahooapis.jp/search/local/V1/localSearch?appid=%s&lat=%s&lon=%s&open=now&dist=3&output=json', yahoo_api_config_json.clientId, latlon.lat, latlon.lon);
    } else {
      var searchQuery;
      try {
        searchQuery = JSON.parse(event.message.text)
      } catch (err) {
        console.log(err)
        const echo = {
          'type': 'text',
          'text': '始めに位置情報を送信して下さい。'
        }
        // 返信
        return client.replyMessage(event.replyToken, echo);
      }
      console.log(searchQuery)
      var lat = searchQuery.lat
      var lon = searchQuery.lon
      var smoke = ['禁煙', '分煙', '喫煙可'].indexOf(searchQuery.smoke) + 1;
      var creditcard;
      switch (searchQuery.card) {
        case 'カード可':
          creditcard = '&creditcard=true'
          break
        case '問わない':
          creditcard = ''
          break
      }
      var week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']['月火水木金土日'.indexOf(searchQuery.day.substring(0, 1))]
      var sort = searchQuery.sort
      var sortJunjo = searchQuery.sortJunjo
      if (sortJunjo === '降順'){
        sort = "=-" + sort
      }
      else {
        sort = "=" + sort
      }
      var hour = searchQuery.time.slice(0, -1)
      url = util.format('https://map.yahooapis.jp/search/local/V1/localSearch?appid=%s&lat=%s&lon=%s&smoking=%i%s&open=%s,%s&sort%s&dist=3&output=json', yahoo_api_config_json.clientId, lat, lon, smoke, creditcard, week, hour, sort);
    }
      console.log(url)
    // ユーザーからBotに位置情報が送られた場合のみ以下が実行される
    var request = require('then-request');
    request('GET', url).done(function (res) {
      var result = JSON.parse(res.getBody('utf8'));
      var restaurants = result.Feature
      var eachRestaurantLayoutTemplate = require("./template/search_result.json")
      var restaurantsLayout = []
      restaurants.forEach(function(restaurant) {
        var eachRestaurantLayout = JSON.parse(JSON.stringify(eachRestaurantLayoutTemplate));
        if(restaurant.Property.LeadImage != undefined) {
          eachRestaurantLayout.body.contents[0].text = restaurant.Name;
          eachRestaurantLayout.body.contents[1].contents[0].contents[1].text = restaurant.Property.Address;
          eachRestaurantLayout.hero.url = restaurant.Property.LeadImage.replace('http://', 'https://')
          eachRestaurantLayout.footer.contents[0].action.uri = util.format('https://www.google.com/maps?q=%s,%s', restaurant.Geometry.Coordinates.split(',')[1], restaurant.Geometry.Coordinates.split(',')[0])
          restaurantsLayout.push(eachRestaurantLayout)
        }
      });
      var carousel = {
        "type": "carousel",
        "contents": restaurantsLayout
      }
      // メッセージを構築
      const echo = {
        'type': 'flex',
        'altText': '検索結果',
        'contents': carousel
      }
      // 返信
      return client.replyMessage(event.replyToken, echo);
    });
  }
}
// Webアプリケーションを開始
const port = process.env.PORT || 3000;
app.use(express.static('public'));
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
