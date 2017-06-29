const webdriver = require('selenium-webdriver'),
  By = webdriver.By,
  until = webdriver.until,
  firefox = require('selenium-webdriver/firefox'),
  fs = require('fs'),
  mysql = require('mysql'),
  parseString = require('xml2js').parseString,
  http = require('http'),
  https = require('https');

const api_key = '3f9c11ae9812c83041cb12955fef71a0';
const db = mysql.createConnection({
  host: "37.140.192.231",
  user: "u0109_song",
  password: "Edzin%07622",
  database: "u0109134_songs"
});

db.connect(function(err) {
  if (err) {
    throw err;
    process.exit();
  }
  console.log("Connected!");
});

var driver = new webdriver.Builder()
  .forBrowser('firefox')
  .build();

driver.get('http://djmixfm.ru/radio/eurohit/');

var lastSong = '';

driver.then(function() {
  setInterval(function() {
    driver.executeScript(function() {
      var data = {};

      if (document.querySelector('.aplayer-track-title__singer')) {
        data.singer = document.querySelector('.aplayer-track-title__singer').innerText;
      } else {
        data.singer = '';
      }
      if (document.querySelector('.aplayer-track-title__song')) {
        data.song = document.querySelector('.aplayer-track-title__song').innerText;
      } else {
        data.song = '';
      }
      data.song = document.querySelector('.aplayer-track-title__song').innerHTML;
      return data;
    }).then(function(data) {
      if (data.singer == '' || lastSong == (data.singer+data.song)) return;
      lastSong = data.singer+data.song;

      var date = new Date();
      var play_date = date.getFullYear()+'-'+zero(date.getMonth()+1)+'-'+zero(date.getDate());
      var play_time = zero(date.getHours())+':'+zero(date.getMinutes());
      var start_song = Math.round(+new Date() / 1000);
      var cover = '';

      http.get({
        hostname: 'ws.audioscrobbler.com',
        port: 80,
        path: '/2.0/?method=artist.getinfo&api_key='+api_key+'&artist='+encodeURIComponent(data.singer)+'&autocorrect=true',
        agent: false
      }, (res) => {
        res.setEncoding('utf8');
        var xml = '';
        res.on('data', function (data) {
          xml += data;
        });
        res.on('end', function () {
          parseString(xml, function (err, result) {
            if (err) {
              throw err;
            }

            console.log(result.lfm.artist[0].image);

            if (result.lfm.$.status == 'ok') {
              var images = result.lfm.artist[0].image;
              var s = images[images.length-1]._;
              var filename = s.substr(s.lastIndexOf('/')+1);
              download(s, 'images/'+filename, null);
              cover = filename;
            }

            saveDate(play_date, data.singer.toUpperCase(), data.song.toUpperCase(), cover, play_time, start_song);
          });
        });
      });

    });
  }, 2000);
});

function saveDate(play_date, artist_name, song_name, cover, play_time, start_song) {
  var sql = "INSERT INTO eurosongs (play_date, artist_name, song_name, cover, play_time, start_song) VALUES ('"+play_date+"', '"+artist_name+"', '"+song_name+"', '"+cover+"', '"+play_time+"', '"+start_song+"')";
  db.query(sql, function(err, result) {
    if (err) throw err;
    console.log("1 record inserted");
  });
}


function zero(i) {
  if (i < 10) return '0'+i;
  else return i;
}
function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest);
    if (cb) cb(err.message);
  });
};
