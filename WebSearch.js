var buildUrl = require('build-url');

// WebUrlfromCity();
// Parameters:
// 1. String CityName
// 2. Arrival Date -    "20.11.17"
// 3. Departure Date -     –||–


var result = WebUrlfromCity("Moskau", "20.11.2017", "21.11.2017");
console.log( result );

function WebUrlfromCity(CityName = '', ArrivalDate ='' ,DepartureDate = '', RoomConfig = '' ) {

    if (CityName == '') {
        return 2;
    }

    var CityId = '';
    //var CityName = 'Moskau';
    // var ArrivalDate = '19.11.2017'; // date only with points
    // var DepartureDate = '20.11.2017'; // date only with points
    // var RoomConfig = '';

    var SearchUrl = buildUrl('https://hotel.check24.de', {
        
            queryParams: {
                hotel_name_filter: 'yes',
                search_submit: 'yes',
                city_id: CityId, // FILL, needed
                poi_id : '', // Facultative, Search by POI from API
                search_type: 'citypoi', // Needed, type 'citypoi' for city search
                hotel_id: '0', // Facultative
                distance_reference_location: '', // Facultative
                distance_max: '', // Facultative,
                citypoi_name: CityName, // !Needed! for City Search
                arrival_date: ArrivalDate,
                departure_date: DepartureDate,
                room_configuration: RoomConfig,
                
              }
        });
        
        return SearchUrl;
}

function WebUrlfromLocation(Location) {

}
