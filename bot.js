// require('dotenv-extended').load();
const builder = require('botbuilder');
const restify = require('restify');
const Promise = require('bluebird');
const request = require('request-promise').defaults({ encoding: null });
const gvision = require('@google-cloud/vision');
const util = require('util');
var another = require('./WebSearch');
var hotelsRequester = require('./HotelRequester');

import TIPrompt from "./TIPrompt"
import Weather from "./Weather"

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
  },
  "Show available options": {
      item: "showAvailableHotels"
  }
}

var bot = new builder.UniversalBot(connector, [
  function (session) {
    
    session.send("Hi, my name is Check24 Hotel Bot")
    session.beginDialog('AskForPhoto')
    
  }
])
TIPrompt.init(builder, bot)

bot.dialog('AskForPhoto', [
  function (session, args) {
    if(args && args.reprompt){
      builder.Prompts.TIPrompt(session, "Couldn't recognise the location, can you take another photo?");
    }
    else{
      builder.Prompts.TIPrompt(session, "Send me the photo of the location you want to go and I will find the best hotels for you nearby :)");
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
        
        console.log("response" + JSON.stringify(response));
        session.conversationData.place = response[0].landmarkAnnotations[0].description
        session.conversationData.latitude = response[0].landmarkAnnotations[0].locations[0].latLng.latitude
        session.conversationData.longitude = response[0].landmarkAnnotations[0].locations[0].latLng.longitude
        session.conversationData.city =""

        console.log("1 session.conversationData.longitude:" + session.conversationData.longitude);
        console.log("1 session.conversationData.latitude:" + session.conversationData.latitude);

          googleMapsClient.reverseGeocode({
            latlng: [session.conversationData.latitude, session.conversationData.longitude],
            language: "de"
          }, function(err, response) {
            if (!err) {
              session.conversationData.city= response.json.results[0].address_components[3].long_name;
              userData.city = session.conversationData.city
              
              console.log("2 session.conversationData.longitude:" + session.conversationData.longitude);
              console.log("2 session.conversationData.latitude:" + session.conversationData.latitude);
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
    
    Weather.forecast(session.conversationData.latitude,
      session.conversationData.longitude,
      userData.date_begin, function(weatherEntry) {
        session.conversationData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
        var niceDate = weatherEntry.maxTemperatureDate.split('-').reverse().join('.');
        session.send(`The best weather in ${userData.city} is ${Math.floor(weatherEntry.maxTemperature)}℃ on ${niceDate}.\nHere is the selection of hotels to stay in from ${userData.date_begin} to ${userData.date_end}.\n You can book it here: ${session.conversationData.surl}.` );
        
        builder.Prompts.choice(session, "Useful commands", menuItems, { listStyle: builder.ListStyle.button });
      });
      
  },
  function(session, results){
      if(results.response){
          session.beginDialog(menuItems[results.response.entity].item);
      }
  }
])

bot.dialog('askForMoveInDate', [
    function (session) {
      
      //session.conversationData.surl = another.data.WebUrlfromCity(userData.city, userData.date_begin, userData.date_end)
      builder.Prompts.time(session, `Your current move-in date is ${userData.date_begin}. Which date is more comfortable for you?`);
    },
    function (session, results) {
      if (!results.response) {
        return;
      }
      var dateStart = builder.EntityRecognizer.resolveTime([results.response])
      if (!dateStart) {
        session.replaceDialog('askForMoveInDate');
      }
      session.conversationData.reservationDate = dateStart;
    
      var dateEnd = new Date(dateStart);
      dateEnd.setDate(dateStart.getDate()+1);
      
      userData.date_begin = `${dateStart.getDate()}.${dateStart.getMonth()+1}.${dateStart.getFullYear()}`
      userData.date_end = `${dateEnd.getDate()}.${dateEnd.getMonth()+1}.${dateEnd.getFullYear()}`
      
      //session.send(`You changed move in date to ${dateStart}.`);
      session.replaceDialog("mainMenu");
    }
  ])
bot.dialog('askForMoveOutDate', [
    function (session) {
      builder.Prompts.time(session, `Your current move-out date is ${userData.date_end}. Which date is more comfortable for you?`);
    },
    function (session, results) {
      if (!results.response) {
        return;
      }

      var dateEnd = builder.EntityRecognizer.resolveTime([results.response])
      if (!dateEnd) {
        session.replaceDialog('askForMoveOutDate');
      }
      session.conversationData.reservationDate = dateEnd;
    
      var dateStart = new Date(dateStart);
      dateStart.setDate(dateStart.getDate()+1);
      
      //userData.date_begin = `${dateStart.getDate()}.${dateStart.getMonth()+1}.${dateStart.getFullYear()}`
      userData.date_end = `${dateEnd.getDate()}.${dateEnd.getMonth() + 1}.${dateEnd.getFullYear()}`
      
      //session.send(`You changed move out date to ${dateEnd}.`);
      session.replaceDialog("mainMenu");
    }
  ])

  
bot.dialog('showAvailableHotels', [
  function (session) {

    hotelsRequester.data.searchArguments.arrival_date = userData.date_begin.split('.').reverse().join('-');
    hotelsRequester.data.searchArguments.departure_date = userData.date_end.split('.').reverse().join('-');
    hotelsRequester.data.searchArguments.longitude = session.conversationData.longitude;
    hotelsRequester.data.searchArguments.latitude = session.conversationData.latitude;
    hotelsRequester.data.getAllResults(function(hotels) {
      var cards = [];
      for (var i = 0; i < hotels.length; ++i) {
        cards.push(new builder.HeroCard(session)
                      .title(hotels[i].name)
                      .subtitle(hotels[i].price + " " + hotels[i].currency)
                      .text(hotels[i].city)
                      .images([
                          builder.CardImage.create(session, hotels[i].image_url)
                      ])
        )
      }
      var reply = new builder.Message(session)
                      .attachmentLayout(builder.AttachmentLayout.carousel)
                      .attachments(cards);

      session.send(reply);
      session.replaceDialog("mainMenu");
    });}
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

// function searchHotels(callback) {
//   if (!callback || typeof callback != "function") {
//     return;
//   }
  

// }



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
