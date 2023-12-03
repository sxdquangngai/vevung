
    var map = L.map('map').setView([16.048, 108.219], 12);
    map.on('click', function (event) {
      var form = document.getElementById('form');
      form.style.display = 'block';
      form.style.top = event.originalEvent.clientY + 'px';
      form.style.left = event.originalEvent.clientX + 'px';
    });

    map.on('dragstart', function () {
      var form = document.getElementById('form');
      form.style.display = 'none';
    });

    L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
	
    var mywms = L.tileLayer.wms("https://api-v2.meeymap.com/geoserver/v2.1/meey_map/wms", {
          layers: 'meeymap%3AHT_VN',
          format: 'image/png',
          transparent: true,
          version: '1.1.1',
          attribution: "country layer"
      });
      mywms.addTo(map);





   proj4.defs('EPSG:3405', '+proj=tmerc +lat_0=0 +lon_0=108 +k=0.9999 +x_0=500000 +y_0=0 +ellps=WGS84 +towgs84=-192.873,-39.382,-111.202,-0.00205,-0.0005,0.00335,0.0188 +units=m +no_defs');

function convertVN2000ToWGS84(vn2000Latitude, vn2000Longitude) {
  var point = proj4('EPSG:3405', 'EPSG:4326', [vn2000Longitude, vn2000Latitude]);
  return { latitude: point[1], longitude: point[0] };
}

// Lưu các điểm và đường đã vẽ
var drawnMarker = new L.FeatureGroup().addTo(map);
var drawnPolyline = new L.FeatureGroup().addTo(map);
var drawnPolygons = new L.FeatureGroup().addTo(map);

function parseCoordinatesFromString(coordinatesString) {
  var coordinates = [];
  var lines = coordinatesString.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line !== '') {
      var parts = line.split(',');
      var vn2000Latitude = parseFloat(parts[0]);
      var vn2000Longitude = parseFloat(parts[1]);
      var wgs84Coordinates = convertVN2000ToWGS84(vn2000Latitude, vn2000Longitude);
      coordinates.push([wgs84Coordinates.latitude, wgs84Coordinates.longitude]);
    }
  }
  return coordinates;
}

function parseCoordinatesFromExcel(jsonData) {
  var coordinates = [];
  var currentRegion = [];
  for (var i = 1; i < jsonData.length; i++) {
    var vn2000Latitude = parseFloat(jsonData[i][0]);
    var vn2000Longitude = parseFloat(jsonData[i][1]);
    var wgs84Coordinates = convertVN2000ToWGS84(vn2000Latitude, vn2000Longitude);

    if (jsonData[i][2] === 'new_diem') {
      if (currentRegion.length > 2) {
        coordinates.push(currentRegion);
      }
      currentRegion = [];
    } else {
      currentRegion.push([wgs84Coordinates.latitude, wgs84Coordinates.longitude]);
    }
  }
  if (currentRegion.length > 2) {
    coordinates.push(currentRegion);
  }
  return coordinates;
}

function drawMarker() {
  var coordinatesInput = document.getElementById('coordinates').value;
  var coordinates = parseCoordinatesFromString(coordinatesInput);
  if (coordinates.length > 0) {
    for (var i = 0; i < coordinates.length; i++) {
      var marker = L.marker(coordinates[i]).addTo(drawnMarker);
    }
    map.fitBounds(drawnMarker.getBounds());
  }
  
  // Add code to handle Excel file upload
  var fileInput = document.getElementById('uploadFile');
  var file = fileInput.files[0];

  var reader = new FileReader();
  reader.onload = function(e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, {type: 'array'});
    var worksheet = workbook.Sheets[workbook.SheetNames[0]];
    var jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
    var excelCoordinates = extractCoordinatesFromExcel(jsonData);

    if (excelCoordinates.length > 0) {
      for (var i = 0; i < excelCoordinates.length; i++) {
        var marker = L.marker(excelCoordinates[i]).addTo(drawnMarker);
      }
      map.fitBounds(drawnMarker.getBounds());
    }
  };

  reader.readAsArrayBuffer(file);
}



function drawPolyline() {
    var coordinatesInput = document.getElementById('coordinates').value;
  var coordinates = parseCoordinatesFromString(coordinatesInput);
  if (coordinates.length > 1) {
    var polyline = L.polyline(coordinates).addTo(drawnPolyline);
    map.fitBounds(polyline.getBounds());
  } 
  
  var fileInput = document.getElementById('file');
  if (fileInput.files.length > 0) {
    var file = fileInput.files[0];
    var extension = file.name.split('.').pop().toLowerCase();
    var reader = new FileReader();
    reader.onload = function (e) {
      var contents = e.target.result;
      var coordinates;
      if (extension === 'xlsx') {
        var workbook = XLSX.read(contents, { type: 'binary' });
        var worksheet = workbook.Sheets[workbook.SheetNames[0]];
        var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        coordinates = parseCoordinatesFromExcel(jsonData);
      }
      if (coordinates && coordinates.length > 1) {
        var polyline = L.polyline(coordinates).addTo(drawnPolyline);
        map.fitBounds(polyline.getBounds());
      } else {
        alert('Định dạng file không hợp lệ hoặc cần ít nhất 2 tọa độ để vẽ đường.');
      }
    };
    if (extension === 'xlsx') {
      reader.readAsBinaryString(file);
    } else {
      alert('Định dạng file không hợp lệ.');
    }
  } 
}

function drawPolygon() {
  var coordinatesInput = document.getElementById('coordinates').value;
  var coordinates = parseCoordinatesFromString(coordinatesInput);
  if (coordinates.length > 2) {
    var polygon = L.polygon(coordinates, { fillColor: 'blue', color: 'red' }).addTo(drawnPolygons);
    map.fitBounds(polygon.getBounds());
  } 
  var fileInput = document.getElementById('file');
  if (fileInput.files.length > 0) {
    var file = fileInput.files[0];
    var extension = file.name.split('.').pop().toLowerCase();
    var reader = new FileReader();
    reader.onload = function (e) {
      var contents = e.target.result;
      var coordinates;
      if (extension === 'xlsx') {
        var workbook = XLSX.read(contents, { type: 'binary' });
        var worksheet = workbook.Sheets[workbook.SheetNames[0]];
        var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        coordinates = parseCoordinatesFromExcel(jsonData);
      }
      if (coordinates && coordinates.length > 1) {
        var polygon = L.polygon(coordinates, { fillColor: 'blue', color: 'red' }).addTo(drawnPolygons);
	        map.fitBounds(polygon.getBounds());
      } else {
        alert('Định dạng file không hợp lệ hoặc cần ít nhất 2 tọa độ để vẽ đường.');
      }
    };
    if (extension === 'xlsx') {
      reader.readAsBinaryString(file);
    } else {
      alert('Định dạng file không hợp lệ.');
    }
  } 
}





function showForm() {
  var form = document.getElementById('form');
  form.style.display = 'block';
}

function hideForm() {
  var form = document.getElementById('form');
  form.style.display = 'none';
}







function saveFile(data, filename) {
  var blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
}

// Hàm để chuyển đổi dữ liệu vẽ điểm sang định dạng GeoJSON
function convertMarkerToGeoJSON() {
  var geojsonData = drawnMarker.toGeoJSON();
  var data = JSON.stringify(geojsonData);
  saveFile(data, 'points.geojson');
}

// Hàm để chuyển đổi dữ liệu vẽ đường sang định dạng GeoJSON
function convertPolylineToGeoJSON() {
  var geojsonData = drawnPolyline.toGeoJSON();
  var data = JSON.stringify(geojsonData);
  saveFile(data, 'polyline.geojson');
}

// Hàm để chuyển đổi dữ liệu vẽ vùng sang định dạng GeoJSON


function convertPolygonsToGeoJSON() {
  var geojsonData = drawnPolygons.toGeoJSON();
  var data = JSON.stringify(geojsonData);
  saveFile(data, 'polygons.geojson');
}

function resetForm() {
  document.getElementById("form").reset();
}
