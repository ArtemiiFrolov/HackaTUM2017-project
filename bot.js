// require('dotenv-extended').load();
var builder = require('botbuilder');
var restify = require('restify');
var Promise = require('bluebird');
var request = require('request-promise').defaults({ encoding: null });
// var gvision = require('@google-cloud/vision');


//=========================================================
// Common Setup
//=========================================================

// var vision = gvision({
//   projectId: 'hackatum-186320',
//   keyFilename: 'gcloud.json'
// });

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});

console.log("APP_ID: " + process.env.MICROSOFT_APP_ID)

// Create chat bot
var connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', function(session){
  var msg = session.message;
  if (msg.attachments.length) {
    // Receive a message with attachments
    var attachment = msg.attachments[0];
    var fileDownload = checkRequiresToken(msg)
          ? requestWithToken(attachment.contentUrl)
          : request(attachment.contentUrl);

    fileDownload.then(
      function (image) {
        console.log(`Attachment of ${attachment.contentType} type and size of ${image.length} bytes received.`)

        // getLocation(image).then(response => {
        //   console.log("Got response from google:")
        //   console.log(response)
        //   var reply = new builder.Message(session)
        //     .text(`${response[0].landmarkAnnotations[0].description}`);
        //   session.send(reply);
        // }).catch(err => {
        //   console.error(err);
        // })
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
})

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
