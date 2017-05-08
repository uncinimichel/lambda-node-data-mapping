var _ = require("lodash");
var ejs = require("ejs");
var fs = require('fs');

var isAday = (date, day) => {
  var today = new Date();
  var anotherDay = new Date();
  var day = day || 0
  anotherDay.setDate(today.getDate() + day);
  return date.toLocaleDateString('en-GB') === anotherDay.toLocaleDateString('en-GB')
}

var testData = [  { date: "2017-05-08 01:00", waveMax : 3},
                  { date: "2017-05-08 04:00", waveMax : 1},
                  { date: "2017-05-09 01:00", waveMax : 3},
                  { date: "2017-05-10 01:00", waveMax : 3},
                  { date: "2017-05-11 01:00", waveMax : 3},
                  { date: "2017-05-12 01:00", waveMax : 3}]

var data =_.chain(testData)
          .map(o => _.assign({}, o, {date: new Date(o.date)}))
          .filter(o => isAday(o.date) || isAday(o.date, 1) || isAday(o.date, 2))
          .groupBy(o => o.date.toLocaleDateString("en-GB"))
          .map(_.identity) //Remove the keys created with the groupBy (date)
          .map(o => _.assign({}, {
                            date: _.first(o).date.toLocaleDateString("en-GB"),
                            name: _.first(o).name,
                            waves: _.meanBy(o, 'waveMax'),
                            temps: _.meanBy(o, 'temps')
                          }))
          .value()

ejs.renderFile("index.ejs", {waves : data}, function(err, rawHtml){
  if(err) {
    console.log(err);
  } else {
    fs.writeFile("index.html", rawHtml, function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    });
  }
});
