var moment = require('moment');
const weather = require('openweathermap-js');

weather.defaults({
    appid: '51bde545749a7b86fa434a6226d8a262',
    method: 'coord',
    format: 'JSON',
    accuracy: 'accurate',
    units: 'metric'
  });
  
export default class Weather {
    static forecast(lat, lon, given_date) {
        var given_date = String(moment(given_date).format("YYYY-MM-DD"))
        weather.forecast({method: 'coord', coord: {lat: lat, lon: lon}, cnt: 200}, function(err, data) {
            if (!err){
            if (typeof given_date != 'undefined'){
                data.list.forEach(function(forecast){
                  var forecast_date = String(forecast.dt_txt).split(' ')[0];
                  if (forecast_date == given_date){
                  console.log(forecast_date, forecast.main.temp, 'C', forecast.weather[0].main)
                  }
                })
            }
          
            else {
                data.list.forEach(function(forecast){
                  var forecast_date = String(forecast.dt_txt).split(' ')[0];
                if(forecast.main.temp > 18 && forecast.weather[0].main == 'Clear') {
                  console.log(forecast_date, forecast.main.temp, 'C', forecast.weather[0].main)
                }
              })
            }
            }  
            else
               console.error(err.message);
        });
    } 
  }
  
