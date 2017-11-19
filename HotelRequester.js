var buildUrl = require('build-url');
var request = require('request-promise').defaults({ encoding: null });

var searchArguments = {
    latitude: 51.958542,
    longitude: 7.627339,
    radius: 10,
    arrival_date: '2017-12-11',
    departure_date: '2017-12-19',
    room_configuration: '%5BA%5D' // Percentage signs are strangely stringified
}

function getAllResults(callback) {

    if(!callback || typeof callback != "function"){
        console.log("callback type:" + (typeof callback));
        return null;
    }

    var searchRequest = buildUrl('https://api.hotel.check24.de/hackatum/hotels/searches.json', { queryParams: searchArguments });

    console.log("Searchrequest:" + searchRequest);

    var intervalId = null;
    var getResults = function (searchId) {
        request("https://api.hotel.check24.de/hackatum/hotels/searches/" + searchId + "/results.json",
                function(err, response, body){
            if (err) { return console.error(err); }

            var parsed = JSON.parse(body);

            if (!parsed.search 
                || !parsed.search.results) {
                return console.error("No search item watching.");
            }

            var hotels = [];

            for (var i = 0; i < parsed.search.results.length; i++) { // var result in parsed.search.results) {
                if (!parsed.search.results[i].name
                    || !parsed.search.results[i].city
                    || !parsed.search.results[i].price){
                    console.log("result doesn't contain name,city,price." + parsed.search.results[i]);
                    continue;
                    }
                hotels.push({
                    name: parsed.search.results[i].name,
                    city: parsed.search.results[i].city,
                    image_url: parsed.search.results[i].image_url
                });
            }

            callback(hotels);

        }).catch(function(err){});
    }

    var checkStatus = function (searchId) {
        request("https://api.hotel.check24.de/hackatum/hotels/searches/" + searchId + ".json",
                function(err, response, body){
            if (err) { return console.error(err); }

            console.log("watching... body:" + body);
            var parsed = JSON.parse(body);

            if (!parsed.search 
                || !parsed.search.status_detailed 
                || !parsed.search.status_detailed.state) {
                return console.error("No search item watching.");
            }

            if ( parsed.search.status_detailed.state == "finished") {
                console.log("Search with id:" + searchId + " state:" + parsed.search.status_detailed.state);
                clearInterval(intervalId);
                getResults(searchId);

                return;
            }
            console.log("Search with id:" + searchId + " state:" + parsed.search.status_detailed.state);
            var checkStatusWrapper = function() {
                checkStatus(parsed.search.id);
            }
            setTimeout(checkStatusWrapper, 50);

        }).catch(function(err){});
    }

    request(searchRequest,
            function(err, response, body){
        if (err)  { return console.error(err); }

        console.log("creating... body:" + body);
        var parsed = JSON.parse(body);

        if (!parsed.search || !parsed.search.id) {
            return console.error("No search item creating.");
        }
        console.log("Search with id created:" + parsed.search.id);

        checkStatus(parsed.search.id);
        // var checkStatusCaller = function() {
        //     checkStatus(parsed.search.id);
        // }

        // intervalId = setInterval(checkStatusCaller, 200);

    }).catch(function(err){});

}

exports.data = {searchArguments, getAllResults};