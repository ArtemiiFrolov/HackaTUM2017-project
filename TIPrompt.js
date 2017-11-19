const restify = require('restify');
const request = require('request-promise').defaults({ encoding: null });
import utils from './Util';

export default class TIPrompt {
    static init(builder, bot) {
        let TIPrompt = new builder.Prompt({ 
                defaultRetryPrompt: "I'm sorry. I didn't recognize your search." 
            }).onRecognize((context, callback) => {
                let isText = context.message.attachments.length == 0
                var result = {
                    promisedImage: context.message.attachments,
                }
                if (isText) {
                    let message = context.message.text
                    if (message.startsWith("http") 
                        && ["jpg", "png"].indexOf(message.split(".").reverse()[0]) != -1) {
                        // just try to download the image by its url
                        result.promisedImage = request(message)
                    } else if (message.indexOf("instagram") != -1) {
                        // use instagram api
                        result.promisedImage = utils.downloadImageFromInstagram(message, {debug: true})
                    }
                } else {
                    result.promisedImage = request(context.message.attachments[0].contentUrl)
                }
                callback(null, 1.0, result)
            });

        bot.dialog('TIPrompt', TIPrompt);

        builder.Prompts.TIPrompt = function (session, prompt, options) {
            var args = options || {};
            args.prompt = prompt || options.prompt;
            session.beginDialog('TIPrompt', args);
        }

        console.log("TIPrompt's ready to be used")
    }
}
