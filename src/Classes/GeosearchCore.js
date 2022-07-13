import { Evented, Util, latLngBounds } from 'leaflet';

export var GeosearchCore = Evented.extend({

  options: {
    zoomToResult: true,
    useMapBounds: 12,
    searchBounds: null
  },

  initialize: function (control, options) {
    Util.setOptions(this, options);
    this._control = control;

    if (!options || !options.providers || !options.providers.length) {
      throw new Error('You must specify at least one provider');
    }

    this._providers = options.providers;
  },

  _geocode: function (text, locationString, provider) {
    var location, latLng;

    location = provider.reverseLocationString(locationString);

    latLng =  L.latLng([location.y, location.x]);

    this.fire('results', {
      results: [{
        latlng: latLng
      }],
      latlng:latLng,
      text: text
    }, true);

    // Always back off 3 from max zoom, we cannot rely on being sent a bounds from the server
    if (this.options.zoomToResult) { 
      this._control._map.setView(latLng, this._control._map.getMaxZoom() - 3);
    }

  },

  _suggest: function (text) {
    var activeRequests = this._providers.length;
    var suggestionsLength = 0;

    var createCallback = Util.bind(function (text, provider) {
      return Util.bind(function (error, suggestions) {
        activeRequests = activeRequests - 1;
        suggestionsLength += suggestions.length;

        if (error) {
          // an error occurred for one of the providers' suggest requests
          this._control._clearProviderSuggestions(provider);

          // perform additional cleanup when all requests are finished
          this._control._finalizeSuggestions(activeRequests, suggestionsLength);

          return;
        }

        if (suggestions.length) {
          for (var i = 0; i < suggestions.length; i++) {
            suggestions[i].provider = provider;
          }
        } else {
          // we still need to update the UI
          this._control._renderSuggestions(suggestions);
        }

        if (provider._lastRender !== text) {
          this._control._clearProviderSuggestions(provider);
        }

        if (suggestions.length && this._control._input.value === text) {
          provider._lastRender = text;
          this._control._renderSuggestions(suggestions);
        }

        // perform additional cleanup when all requests are finished
        this._control._finalizeSuggestions(activeRequests, suggestionsLength);
      }, this);
    }, this);

    this._pendingSuggestions = [];

    for (var i = 0; i < this._providers.length; i++) {
      var provider = this._providers[i];
      var request = provider.suggestions(text, this._searchBounds(), createCallback(text, provider));
      this._pendingSuggestions.push(request);
    }
  },

  _searchBounds: function () {
    if (this.options.searchBounds !== null) {
      return this.options.searchBounds;
    }

    if (this.options.useMapBounds === false) {
      return null;
    }

    if (this.options.useMapBounds === true) {
      return this._control._map.getBounds();
    }

    if (this.options.useMapBounds <= this._control._map.getZoom()) {
      return this._control._map.getBounds();
    }

    return null;
  },

  _boundsFromResults: function (results) {
    if (!results.length) {
      return;
    }

    var nullIsland = latLngBounds([0, 0], [0, 0]);
    var resultBounds = [];
    var resultLatlngs = [];

    // collect the bounds and center of each result
    for (var i = results.length - 1; i >= 0; i--) {
      var result = results[i];

      resultLatlngs.push(result.latlng);

      // make sure bounds are valid and not 0,0. sometimes bounds are incorrect or not present
      if (result.bounds && result.bounds.isValid() && !result.bounds.equals(nullIsland)) {
        resultBounds.push(result.bounds);
      }
    }

    // form a bounds object containing all center points
    var bounds = latLngBounds(resultLatlngs);

    // and extend it to contain all bounds objects
    for (var j = 0; j < resultBounds.length; j++) {
      bounds.extend(resultBounds[j]);
    }

    return bounds;
  },

  _getAttribution: function () {
    var attribs = [];
    var providers = this._providers;

    for (var i = 0; i < providers.length; i++) {
      if (providers[i].options.attribution) {
        attribs.push(providers[i].options.attribution);
      }
    }

    return attribs.join(', ');
  }

});

export function geosearchCore (control, options) {
  return new GeosearchCore(control, options);
}

export default geosearchCore;
