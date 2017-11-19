const request = require('request-promise').defaults({ encoding: null });
const util = require('util');

export default class Utils {
    static downloadImageFromInstagram(url, {debug} = {}) {
        debug = debug || false;
        var req = {
            method : 'GET',
            uri: url.replace(/\/$/, "") +  '/media',
            qs: {
                size: 'l',
            }
        }
        if (debug) console.log(`UTILS: MAKING INSTAGRAM REQUEST: ${util.inspect(req)}`)
        return request(req)
    }
}
