export default class TIPrompt {
    static init(builder, bot) {
        var TIPrompt = new builder.Prompt({ 
            defaultRetryPrompt: "I'm sorry. I didn't recognize your search." 
            }).onRecognize(function (context, callback) {
            callback(null, 1.0, {
                type: context.message.attachments.length ? TIPrompt.Image : TIPrompt.Text,
                attachments: context.message.attachments,
            })
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

TIPrompt.Image = 0
TIPrompt.Text = 1

