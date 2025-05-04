"use strict";

const LATSEDECENTRALE = 44.699818;
const LNGSEDECENTRALE = 8.036365;
const coordinateSedeCentrale = {
  lng: LNGSEDECENTRALE,
  lat: LATSEDECENTRALE
};

const style = {
  "version": 8,
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256,
      //"attribution": "&copy; OpenStreetMap Contributors",
      "maxzoom": 19
    }
  },
  "layers": [{
    "id": "osm",
    "type": "raster",
    "source": "osm" // This must match the source key above
  }]
}

function popolaMappa(perizie) {
  // Inizializza la mappa

  const mapOptions = {
    container: "mapContainer", // container id
    style: style,
    center: [LNGSEDECENTRALE, LATSEDECENTRALE], // starting position [lng, lat]
    zoom: 12
  }
  const map = new maplibregl.Map(mapOptions);
  map.addControl(new maplibregl.NavigationControl()); // 'top-right'
  const scaleOptions = { maxWidth: 80, unit: 'metric' }
  map.addControl(new maplibregl.ScaleControl(scaleOptions))

  // Aggiungi il segnaposto per la sede centrale
  new maplibregl.Marker({ color: "red" })
    .setLngLat([LNGSEDECENTRALE, LATSEDECENTRALE])
    .setPopup(new maplibregl.Popup().setHTML("<h2>SEDE CENTRALE</h2>"))
    .addTo(map);

  // Aggiungi i segnaposti per le perizie
  for (const perizia of perizie) {
    let marker = new maplibregl.Marker({ color: "#229" })
      .setLngLat([perizia.coordinate.lng, perizia.coordinate.lat])
      .addTo(map);

    // Aggiungi un popup al segnaposto
    let popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
      <h3>${perizia.descrizione}</h3>
      <button class="btnMarker" onclick="visualizzaDettagli('${perizia._id}')"> Visualizza dettagli </button>
      <br>
      <br>
      <button class="btnMarker" onclick="vediPercorso('${perizia._id}', '${perizia.descrizione}', '${perizia.coordinate.lat}', '${perizia.coordinate.lng}', '${map}', this)"> Vedi percorso </button>
    `);
    marker.setPopup(popup);
  }


}

// Funzione per visualizzare i dettagli della perizia
async function visualizzaDettagli(periziaId) {
  const request = await inviaRichiesta("GET", `/api/getDettagliPerizia`, { periziaId });
  if (request) {
    let perizia = request.data[0]

    const isoDate = perizia.dataOra;
    const date = new Date(isoDate);
    const readableDate = date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    $("#dettagliPerizia").html(`Id perizia: <b1>${periziaId}</b1> - Utente: <b2>${perizia.idUtente}</b2>`);
    getIndirizzo(perizia.coordinate, function (indirizzo) {
      $("#indirizzo").text(indirizzo || "Indirizzo non disponibile");
    });
    $("#dataOra").text(readableDate);
    $("#descrizionePerizia").text(perizia.descrizione);
    
    let fotoContainer = $("#fotoContainer");
    fotoContainer.empty();
    let i = 1
    for (const foto of perizia.fotografie) {
      $("<img>").prop("src", foto.url).css({ "margin": "5px" }).appendTo(fotoContainer)
      $("<textarea>").addClass("commentoFoto").prop("id", `cF-${i++}`).text(foto.commento).appendTo(fotoContainer)
      $("<br>").appendTo(fotoContainer)
    }

    let indirizzo = $("#indirizzo").show()
    let dataOra = $("#dataOra").show()
    let descrizionePerizia = $("#descrizionePerizia").show()
    fotoContainer = $("#fotoContainer").show()
    let btnSalvaModifiche = $("#btnSalvaModifiche").show()
  }
}

// Funzione per ottenere l'indirizzo dalle coordinate
function getIndirizzo(coordinate, callback) {
  let url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.lat}&lon=${coordinate.lng}`;
  $.getJSON(url, function (data) {
    if (data && data.display_name) {
      callback(data.display_name);
    } else {
      callback(null);
    }
  });
}

async function getCoordinates(uriAddress) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${uriAddress}`

  const httpResponse = await inviaRichiesta("GET", url)

  if (httpResponse.data.length > 0) {
    return {
      lat: parseFloat(httpResponse.data[0].lat),
      lng: parseFloat(httpResponse.data[0].lon)
    };
  } else {
    throw new Error("Indirizzo non trovato");
  }
}

async function getRoute(start, end) {
  const apiKey = "5b3ce3597851110001cf6248cdf3008a908e459f89e0612728e9be28";
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}`;

  let httpResponse = await inviaRichiesta('POST', url, { "coordinates": [start, end] })
    .catch(function (error) { throw new Error("errore openrouteservice API"); });

  console.log(httpResponse.data.routes);

  if (httpResponse.data.routes && httpResponse.data.routes.length > 0) {
    const route = httpResponse.data.routes[0];
    const decodedRoute = polyline.decode(route.geometry);

    return {
      coordinates: decodedRoute,
      distance: route.summary.distance, // distanza in metri
      duration: route.summary.duration  // durata in secondi
    };
  } else {
    throw new Error("Nessun percorso trovato");
  }
}


async function getAddressFromCoordinates(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const address = data.address;

    const city = address.city || address.town || address.village || address.hamlet || '';
    const road = address.road || address.pedestrian || address.footway || address.path || '';
    const houseNumber = address.house_number || '';

    const fullAddress = `${city}, ${road} ${houseNumber}`.trim();
    return fullAddress;
  } catch (error) {
    console.error("Errore durante il reverse geocoding:", error);
    return null;
  }
}

async function vediPercorso(idPerizia, descrizionePerizia, latDest, lngDest, map, button) {
  console.log(idPerizia)

  const popupElement = button.closest('.maplibregl-popup-content');
  if (popupElement) {
    popupElement.innerHTML = "<h3>Calcolo del percorso...</h3>";
  }

  // Prima otteniamo gli indirizzi, in modo sincrono usando await
  const indirizzoSedeCentrale = await getAddressFromCoordinates(LATSEDECENTRALE, LNGSEDECENTRALE)
    .catch(error => { console.error(error); return null; });
  const indirizzoPerizia = await getAddressFromCoordinates(latDest, lngDest)
    .catch(error => { console.error(error); return null; });

  console.log("Indirizzo sede centrale:", indirizzoSedeCentrale);
  console.log("Indirizzo perizia:", indirizzoPerizia);

  if (!indirizzoSedeCentrale || !indirizzoPerizia) {
    console.error("Non è stato possibile recuperare uno degli indirizzi.");
    return;
  }

  // Ora possiamo passare agli step successivi
  const originCoords = await getCoordinates(encodeURIComponent(indirizzoSedeCentrale))
    .catch(error => { console.error(error); return null; });
  const destinationCoords = await getCoordinates(encodeURIComponent(indirizzoPerizia))
    .catch(error => { console.error(error); return null; });

  if (!originCoords || !destinationCoords) {
    console.error("Non è stato possibile recuperare una delle coordinate.");
    return;
  }

  const lng = (originCoords.lng + destinationCoords.lng) / 2;
  const lat = (originCoords.lat + destinationCoords.lat) / 2;
  const zoom = 12;

  const mapOptions = {
    container: "mapContainer",
    style: style,
    center: [lng, lat],
    zoom: zoom
  };

  map = new maplibregl.Map(mapOptions);
  map.addControl(new maplibregl.NavigationControl());

  new maplibregl.Marker({ color: "red" })
    .setLngLat([LNGSEDECENTRALE, LATSEDECENTRALE])
    .setPopup(new maplibregl.Popup().setHTML("<h2>SEDE CENTRALE</h2>"))
    .addTo(map);

  new maplibregl.Marker({ color: "blue" })
    .setLngLat([lngDest, latDest])
    .setPopup(new maplibregl.Popup().setHTML(`
        <h3>${descrizionePerizia}</h3>
        <button class="btnMarker" onclick="visualizzaDettagli('${idPerizia}')"> Visualizza dettagli </button>
      `))
    .addTo(map);

  map.on('load', async () => {
    const start = [originCoords.lng, originCoords.lat];
    const end = [destinationCoords.lng, destinationCoords.lat];
    const routeData = await getRoute(start, end);
    const routeCoordinates = routeData.coordinates;
    const distanzaKm = (routeData.distance / 1000).toFixed(2);
    const durataMinuti = Math.ceil(routeData.duration / 60);

    if (!map.getSource('route')) {
      map.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': routeCoordinates.map(coord => [coord[1], coord[0]])
          }
        }
      });

      map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#222',
          'line-width': 6
        }
      });
    } else {
      map.getSource('route').setData({
        'type': 'Feature',
        'geometry': {
          'type': 'LineString',
          'coordinates': routeCoordinates.map(coord => [coord[1], coord[0]])
        }
      });
    }

    Swal.fire({
      html: `
        <h2>Percorso trovato!</h2>
        <div>Tempo stimato: <b>${durataMinuti} minuti</b></div>
        <div>Distanza: <b>${distanzaKm} km</b></div>
      `,
      icon: "success"
    });
  });
}
