const request = require('request-promise');
// const fs = require('fs');


// DownloadPicFromInstagram(Instagram Url),
// DownloadPictureFromUrl(Picture Url) The Picture Url is one with .png/ .jpg on the end;

// Both functions return the RAW data from a get response body 
// without ANY Checking

// Doesn't work

var GomezLink = 'https://www.instagram.com/p/BW4LoqjgExn'


function DownloadPicFromInstagram (Url = '' ){
    var options = {
        method : 'GET',
        uri: Url.replace(/\/$/, "") +  '/media',
        qs: {
            size: 'l',
        }
    }

    request()
    request(options, )
        .then(function(response) {
        
            console.log(options);
    })
}

function DownloadPictureFromUrl (Url = '') {
    var img = '';
    request.get(Url,  null,function (error, response, body) {
        if (!error && response.statusCode == 200) {
             img = body;

            //body.setEncoding("binary");
            console.log( body);

            //return body;
        }
    }); 
}


// DownloadPicFromInstagram('https://www.instagram.com/p/BW4LoqjgExn');

//DownloadPictureFromUrl.