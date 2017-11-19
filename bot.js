// require('dotenv-extended').load();
const builder = require('botbuilder');
const restify = require('restify');
const Promise = require('bluebird');
const request = require('request-promise').defaults({ encoding: null });
const gvision = require('@google-cloud/vision');
const util = require('util');
var another = require('./WebSearch');

import TIPrompt from "./TIPrompt"

//=========================================================
// Common Setup
//=========================================================
var today = new Date();
var today_t = `${today.getDate()}.${today.getMonth()+1}.${today.getFullYear()}`

var tomorrow = new Date();
tomorrow.setDate(today.getDate()+1);
var tomorrow_t = `${tomorrow.getDate()}.${tomorrow.getMonth()+1}.${tomorrow.getFullYear()}`
var userData={"city": "", "date_begin": today_t, "date_end":tomorrow_t}

let vision = gvision({
  projectId: 'hackatum-186320',
  keyFilename: 'gcloud.json'
})

let googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyDiasgPX5UdjnWlfTflCdl0GqJj7bearm4'
})

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
let server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3978, function () {
  
})


// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
})

server.post('/api/messages', connector.listen())

//=========================================================
// Bots Dialogs
//=========================================================

var bot = new builder.UniversalBot(connector, [
  function (session) {
    
    session.send("Launched")
    session.beginDialog('AskForPhoto')
    
  },
  function (session, results) {
    session.dialogData.place = results.response.description
    session.dialogData.latitude = results.response.locations[0].latLng.latitude
    session.dialogData.longitude = results.response.locations[0].latLng.longitude
    session.dialogData.city =""

      googleMapsClient.reverseGeocode({
        latlng: [session.dialogData.latitude, session.dialogData.longitude],
        language: "de"
      }, function(err, response) {
        if (!err) {
          session.dialogData.city= response.json.results[0].address_components[3].long_name;
          userData.city = session.dialogData.city
          
          session.beginDialog('askForMoveInDate');
        }
      });    
  },
  function (session, results) {
    session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
    
    var temp = new Date(session.dialogData.reservationDate);
    temp.setDate(session.dialogData.reservationDate.getDate()+1);
    
    userData.date_begin = `${session.dialogData.reservationDate.getDate()}.${session.dialogData.reservationDate.getMonth()+1}.${session.dialogData.reservationDate.getFullYear()}`
    userData.date_end = `${temp.getDate()}.${temp.getMonth()+1}.${temp.getFullYear()}`
    
    session.send(`You want to see  ${session.dialogData.place} in
    city: ${session.dialogData.city}? Move in date: ${userData.date_begin}`);
    session.beginDialog('askForMoveOutDate');
  },
  function (session, results) {
    session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
    userData.date_end = `${session.dialogData.reservationDate.getDate()}.${session.dialogData.reservationDate.getMonth()+1}.${session.dialogData.reservationDate.getFullYear()}`
    session.dialogData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
    session.send(`Here is a hotels for you in ${userData.city} from ${userData.date_begin} to ${userData.date_end}  Here's a link ${session.dialogData.surl}.` );
    session.endDialog()
  }
])
TIPrompt.init(builder, bot)

bot.dialog('AskForPhoto',
  [
    function (session) {
      builder.Prompts.TIPrompt(session, "Send a photo");
    },
    function (session, results) {
      results.response.promisedImage.then(image => {
        getLocation(image).then(response => {
          session.endDialogWithResult({
            response: response[0].landmarkAnnotations[0]
          });            
        }).catch(err => {
          console.error(err);
        })
      }).catch(err => {
        console.log(err)
      });
    }
  ])

bot.dialog('askForMoveInDate', [
    function (session) {   
      
      session.dialogData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
      builder.Prompts.time(session, `Here is a hotels for you in ${userData.city}. Here's a link ${session.dialogData.surl}.  Specify date of move-in if you want `);
    },
    function (session, results) {
      session.endDialogWithResult(results);
    }
  ])
bot.dialog('askForMoveOutDate', [
    function (session) {    
      session.dialogData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
      builder.Prompts.time(session, `Here is a hotels for you in ${userData.city} from ${userData.date_begin} to ${userData.date_end}  Here's a link ${session.dialogData.surl}.  
      Specify date of move-out if you want `);
    },
    function (session, results) {
      session.endDialogWithResult(results);
    }
  ])
  

//=========================================================
// Utils
//=========================================================

// Request location by image
function getLocation(data) {
  var image = {
    content: data
  };
  return vision.landmarkDetection(image)
}



// Request file with Authentication Header
var requestWithToken = function (url) {
  return obtainToken().then(function (token) {
    return request({
      url: url,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/octet-stream'
      }
    });
  });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
  return message.source === 'skype' || message.source === 'msteams';
};
