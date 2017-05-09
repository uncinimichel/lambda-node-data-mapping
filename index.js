'use strict';

var _ = require("lodash");
var ejs = require("ejs");
// var fs = require('fs');
const aws = require('aws-sdk');
const s3 = new aws.S3({ apiVersion: '2006-03-01' });

var getDate = (day) => {
  var today = new Date();
  var anotherDay = new Date();
  var day = day || 0
  anotherDay.setDate(today.getDate() + day);
  return anotherDay.toLocaleDateString('en-GB');
}

var isAday = (date, day) => {
  var today = new Date();
  var anotherDay = new Date();
  var day = day || 0
  anotherDay.setDate(today.getDate() + day);
  return date.toLocaleDateString('en-GB') === anotherDay.toLocaleDateString('en-GB')
}


var dataConversionFun = (surfing) => _.map(surfing, data => _.chain(data)
                                      .map(o => _.assign({}, o, {date: new Date(o.date)}))
                                      .filter(o => isAday(o.date) || isAday(o.date, 1) || isAday(o.date, 2))
                                      .groupBy(o => o.date.toLocaleDateString("en-GB"))
                                      .map(_.identity) //Remove the keys created with the groupBy (date)
                                      .map(o => _.assign({}, {
                                                        date: _.first(o).date.toLocaleDateString("en-GB"),
                                                        name: _.first(o)["surf-location"],
                                                        source: _.first(o).source,
                                                        unit: _.first(o).unit,
                                                        waves: parseFloat(Math.round(_.meanBy(o, 'wave-max') * 100) / 100).toFixed(2),
                                                        tmpe: parseFloat(Math.round(_.meanBy(o, 'tmpe') * 100) / 100).toFixed(2)
                                                      }))
                                      .value());





exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const params = {
        Bucket: bucket,
        Key: key,
    };
    s3.getObject(params, (err, data) => {
        if (err) {
            callback("Error getting object: " + params + ", with error: "+ err);
        } else {
          const surfData = JSON.parse(data.Body.toString('utf-8'));
          const parsedData = dataConversionFun(surfData);
          ejs.renderFile("index.ejs", {locations: parsedData,
                                       today:  getDate(),
                                       tomorrow: getDate(1),
                                       afterTomorrow: getDate(2)
                                      },
                                      (err, indexHtml) => {
                                          if(err) {
                                            console.log("Errors during ejs parsing:", err);
                                          } else {
                                            const uploadParam = {
                                              Bucket: "com.surfing.website",
                                              Key: "index.html",
                                              Body: indexHtml,
                                              'Content-Type': 'text/html; charset=utf-8'
                                            }
                                            s3.upload(uploadParam, (err, data) => {
                                              if (err){
                                                  callback("Error putting object: " + params + ", with error: "+ err);
                                              } else {
                                                console.log("All good!!");           // successful response
                                                callback(null, data);
                                              }
                                            })
                                          }
                                      });
        }
    });
};
