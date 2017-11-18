var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request = require('request-promise').defaults({ encoding: null });
var gvision = require('@google-cloud/vision');


//=========================================================
// Common Setup
//=========================================================

var vision = gvision({
  projectId: 'hackatum-186320',
  keyFilename: 'gcloud.json'
});

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
//var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var bot = new builder.UniversalBot(connector, [
  function (session) {
      session.send("Launched");
      session.beginDialog('AskForPhoto');
  },
  function (session, results) {
    console.log("results2: " + results);
      session.dialogData.reservationDate = results.response;
      session.beginDialog('askForPartySize');
  },
  function (session, results) {
      session.dialogData.partySize = results.response;
      session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize}`);
      session.endDialog();
  }
]);
/*
// Dialog to ask for a date and time
bot.dialog('askForFoto', [
  function (session) {
      builder.Prompts.attachment(session, "Please send photo");
  },
  function (session, results) {
      session.endDialogWithResult(results);
  }
]);*/

// Dialog to ask for number of people in the party
bot.dialog('askForPartySize', [
  function (session) {
      builder.Prompts.text(session, "How many people are in your party?");
  },
  function (session, results) {
      session.endDialogWithResult(results);
  }
])





var reply = "";

bot.dialog('AskForPhoto', 
[
  function (session) {
    builder.Prompts.attachment(session, "Send a photo, pidr");
  },
  function (session, results) {
    var attachments = results.response
    console.log(results);
    if (attachments.length) {
      // Receive a message with attachments
      var attachment = attachments[0];
      var fileDownload = request(attachment.contentUrl);

      fileDownload.then(
        function (image) {
          console.log(`Attachment of ${attachment.contentType} type and size of ${image.length} bytes received.`)
  
          getLocation(image).then(response => {
            console.log("Got response from google:")
            console.log(response)
            //reply = new builder.Message(session)
             // .text(`${response[0].landmarkAnnotations[0].description}`);
            reply = "Hello";
            session.endDialogWithResult({
              response: `${response[0].landmarkAnnotations[0].description}`
            });
            //session.send(reply);
          }).catch(err => {
            console.error(err);
          })
        }
      ).catch(
        function (err) {
          console.log('Error downloading attachment:', { statusCode: err.statusCode, message: err.response.statusMessage });
        }
      );
  
    } else {
      // No attachments were sent
      session.send("You sent %s which was %d characters", session.message.text, session.message.text.length);
    }
    console.log("reply: " + reply);
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
