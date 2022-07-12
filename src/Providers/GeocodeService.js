import { GeocodeService } from '../Services/Geocode';

export var GeocodeServiceProvider = GeocodeService.extend({
  options: {
    label: 'Geocode Server',
    maxResults: 5
  },

  suggestions: function (text, bounds, callback) {
    if (this.options.supportsSuggest) {
      var request = this.suggest().singleLine(text);

      // ignore bounds for the time being
      // if (bounds) {
      //   request.within(bounds);
      // }

      return request.run(function (error, results, response) {
        var suggestions = [];
        if (!error) {
          while (response.candidates.length && suggestions.length <= (this.options.maxResults - 1)) {
            var suggestion = response.candidates.shift();
            if (!suggestion.isCollection) {
              suggestions.push({
                text: suggestion.address,
                unformattedText: suggestion.address,
                location: suggestion.location
              });
            }
          }
        }
        callback(error, suggestions);
      }, this);
    } else {
      callback(null, []);
      return false;
    }
  },

  results: function (text, key, bounds, callback) {
    var request = this.geocode().text(text);

    if (key) {
      request.key(key);
    }

    request.maxLocations(this.options.maxResults);

    // ignore bounds for the time being
    // if (bounds) {
    //   request.within(bounds);
    // }

    return request.run(function (error, response) {
      callback(error, response.results);
    }, this);
  }
});

export function geocodeServiceProvider (options) {
  return new GeocodeServiceProvider(options);
}

export default geocodeServiceProvider;
