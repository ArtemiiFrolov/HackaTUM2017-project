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

var menuItems = { 
  "Load Photo": {
      item: "AskForPhoto"
  },
  "Change move in date": {
      item: "askForMoveInDate"
  },
  "Change move out date": {
      item: "askForMoveOutDate"
  }
}

var bot = new builder.UniversalBot(connector, [
  function (session) {
    
    session.send("Launched")
    session.beginDialog('AskForPhoto')
    
  }
])
TIPrompt.init(builder, bot)

bot.dialog('AskForPhoto', [
  function (session, args) {
    if(args && args.reprompt){
      builder.Prompts.TIPrompt(session, "Couldn't recognise the landmark, can you take another photo?");
    }
    else{
      builder.Prompts.TIPrompt(session, "Send a photo");
    }
  },
  function (session, results) {
    results.response.promisedImage.then(image => {
      getLocation(image).then(response => {
        if (!response
            || response.length == 0
            || response[0].landmarkAnnotations.length == 0) {
          session.replaceDialog("AskForPhoto", { reprompt: true });
          return;
        }
        
        session.dialogData.place = response[0].landmarkAnnotations[0].description
        session.dialogData.latitude = response[0].landmarkAnnotations[0].locations[0].latLng.latitude
        session.dialogData.longitude = response[0].landmarkAnnotations[0].locations[0].latLng.longitude
        session.dialogData.city =""

          googleMapsClient.reverseGeocode({
            latlng: [session.dialogData.latitude, session.dialogData.longitude],
            language: "de"
          }, function(err, response) {
            if (!err) {
              session.dialogData.city= response.json.results[0].address_components[3].long_name;
              userData.city = session.dialogData.city
              
              session.beginDialog('mainMenu');
            } else {
              console.log(err)
              session.replaceDialog("AskForPhoto", { reprompt: true });
            }
          });    
      }).catch(err => {
        console.error(err);
        session.replaceDialog("AskForPhoto", { reprompt: true });
      })
    }).catch(err => {
      console.log(err)
      session.replaceDialog("AskForPhoto", { reprompt: true });
    });
  }
])
.triggerAction({
  // The user can request this at any time.
  // Once triggered, it clears the stack and prompts the send photo again.
  matches: /^exit$/i,
  confirmPrompt: "This will cancel your request. Are you sure?"
});

bot.dialog('mainMenu', [
  function(session){
      builder.Prompts.choice(session, "Main Menu:", menuItems, { listStyle: builder.ListStyle.button });
  },
  function(session, results){
      if(results.response){
          session.beginDialog(menuItems[results.response.entity].item);
      }
  }
])

bot.dialog('askForMoveInDate', [
    function (session) {
      
      //session.dialogData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
      builder.Prompts.time(session, `Your current move in date is ${userData.date_begin}. Which date is more comfortable for you?`);
    },
    function (session, results) {
      if (!results.response) {
        return;
      }
      var dateStart = builder.EntityRecognizer.resolveTime([results.response])
      if (!dateStart) {
        session.replaceDialog('askForMoveInDate');
      }
      session.dialogData.reservationDate = dateStart;
    
      var dateEnd = new Date(dateStart);
      dateEnd.setDate(dateStart.getDate()+1);
      
      userData.date_begin = `${dateStart.getDate()}.${dateStart.getMonth()+1}.${dateStart.getFullYear()}`
      userData.date_end = `${dateEnd.getDate()}.${dateEnd.getMonth()+1}.${dateEnd.getFullYear()}`
      
      session.send(`You changed move in date to ${userData.date_begin}.`);
      session.replaceDialog("mainMenu");
    }
  ])
bot.dialog('askForMoveOutDate', [
    function (session) {
      builder.Prompts.time(session, `Your current move out date is ${userData.date_end}. Which date is more comfortable for you?`);
    },
    function (session, results) {
      if (!results.response) {
        return;
      }

      var dateEnd = builder.EntityRecognizer.resolveTime([results.response])
      if (!dateEnd) {
        session.replaceDialog('askForMoveOutDate');
      }
      session.dialogData.reservationDate = dateEnd;
    
      var dateStart = new Date(dateStart);
      dateStart.setDate(dateStart.getDate()+1);
      
      //userData.date_begin = `${dateStart.getDate()}.${dateStart.getMonth()+1}.${dateStart.getFullYear()}`
      userData.date_end = `${dateEnd.getDate()}.${dateEnd.getMonth() + 1}.${dateEnd.getFullYear()}`
      
      session.send(`You changed move out date to ${userData.date_end}.`);
      session.replaceDialog("mainMenu");
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
