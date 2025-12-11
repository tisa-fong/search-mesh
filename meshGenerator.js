import * as consts from "./meshConsts.js"

// function export list is at the bottom
//This generates meshes on a leaflet map based on the Japanese mesh system

//////////////////////////////////
// Global Variables
//////////////////////////////////
const mapMeshSettings = {
  meshSize: 1,
  meshCache: {},
  textVisiblity: false, // メッシュのテキスト表示
  searchMarker: null // 検索時のマーカーを準備
}

let map = null
let canvasRenderer = null 
let meshLayer = null

let getUserSelectedMeshSize = null;
let isMeshCodeSelected = null;
let meshClicked = null;
let updateMapPositionCookie = null;

//////////////////////////////////
// Exported Functions - see list(and export) at the bottom of this file
//////////////////////////////////
function initMapGenerator(   
    _getUserSelectedMeshSize, 
    _isMeshCodeSelected,
    _meshClicked,
    _updateMapPositionCookie,
  ){
  // get updated consts data into Settings
  getUserSelectedMeshSize = _getUserSelectedMeshSize;
  isMeshCodeSelected = _isMeshCodeSelected;
  meshClicked = _meshClicked;
  updateMapPositionCookie = _updateMapPositionCookie;

  // Set map defaults and consts
  canvasRenderer = L.canvas({  });
  meshLayer = L.layerGroup();
  map = L.map(consts.MAP_DOM_ID).setView(consts.START_DATA.coordinates, consts.START_DATA.zoom); //Sets default area to show at load
  map.doubleClickZoom.disable();
  // メッシュグループをレイヤーとして追加
  map.addLayer(meshLayer);

  // Use OpenStreetMap image tiles for my map
  L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ',
  }).addTo(map); 

  // 移動、ズームが終了時の処理 - update meshes on map zoom or move
  map.on("moveend", function (e) {
    updateMapMeshes();
    updateMapPositionCookie(map.getCenter().lat, map.getCenter().lng, map.getZoom())
  });

  updateMapMeshes();
}

// メッシュレイヤー表示
function updateMapMeshes() {
  // 前回のメッシュ表示を削除
  meshLayer.clearLayers();

  // ズームレベルから表示するメッシュサイズを取得
  const meshSize = getMeshSizeFromZoomSize();

  // ズームレベルからメッシュ内のテキスト表示／非表示を設定
  setMeshTextVisiblity();

  // 表示中の緯度経度範囲を取得 
  const bounds = map.getBounds();
  const bound_northLat = bounds.getNorthEast().lat;
  const bound_southLat = bounds.getSouthWest().lat;
  const bound_eastLon  = bounds.getNorthEast().lng;
  const bound_westLon  = bounds.getSouthWest().lng;
  // console.log(`${bound_northLat}, ${bound_southLat}, ${bound_eastLon}, ${bound_westLon}`)

  // 南西のメッシュコードを取得
  const minMeshArray = getMeshCodeParts_fromLatLon(meshSize, bound_southLat, bound_westLon);

  // 南西のメッシュコードの最小緯度経度を取得
  const [minMeshMinLat, minMeshMinLon] = getMeshMinLatlon(minMeshArray);

  // メッシュの一辺の緯度経度サイズ配列取得
  const meshLatUnit = consts.MESH_DATA[meshSize].ratio.lat;
  const meshLonUnit = consts.MESH_DATA[meshSize].ratio.lon;

  // 西端から東端までループ
  let lonCounter = 0;
  while (true) {
    // 現在の経度を算出 calculate the longitude
    const currMeshMinLon = minMeshMinLon + (meshLonUnit * lonCounter);
    const currMeshMaxLon = minMeshMinLon + (meshLonUnit * (lonCounter + 1));
    if (currMeshMinLon > bound_eastLon) break; // finished across

    // 南端から北端までループ
    var latCounter = 0;
    while (true) {
      // 現在の緯度を算出
      const currMeshMinLat = minMeshMinLat + meshLatUnit * latCounter;
      const currMeshMaxLat = minMeshMinLat + meshLatUnit * (latCounter + 1);
      if (currMeshMinLat > bound_northLat) break; // finished vertically

      // 現在のメッシュの中央の緯度経度を算出
      const currMeshCenterLat = currMeshMinLat + (meshLatUnit / 2);
      const currMeshCenterLon = currMeshMinLon + (meshLonUnit / 2);
      // 現在のメッシュコードを取得
      const currMeshCode = getMeshCodeParts_fromLatLon(
        meshSize,
        currMeshCenterLat,
        currMeshCenterLon
      ).join("");

      // 日本のメッシュチェック
      if (!checkLatlonInside(currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon)) { 
        latCounter++;
        continue;
      }

      // メッシュポリゴン生成
      const cellBounds = [[currMeshMinLat, currMeshMinLon], [currMeshMaxLat, currMeshMaxLon]];
      const meshPolygon = L.rectangle(cellBounds, {
        // renderer: canvasRenderer
      });
      meshPolygon._meshCode = currMeshCode; // Store meshcode on itself

      // 選択したメッシュの行番号を取得
      const selectedCode = isMeshCodeSelected(currMeshCode);

      // スタイル設定
      setMeshStyle(meshPolygon, meshSize, selectedCode);


      // テキスト表示設定
      if (mapMeshSettings.textVisiblity) {
        setMeshText(meshPolygon, false);
      }
      
      // イベント設定
      meshPolygon.on("mouseover", function () {
        // スタイル設定
        setMouseOverOutStyle(this, meshSize, true);
        if (mapMeshSettings.textVisiblity) {
          // テキスト表示設定
          setMeshText(this, true);
        }
      });
      meshPolygon.on("mouseout", function () {
        // スタイル設定
        setMouseOverOutStyle(this, meshSize, false);
        // テキスト表示設定
        if (mapMeshSettings.textVisiblity) {
          // テキスト表示
          setMeshText(this, false);
        }
      });
      meshPolygon.on("click", function () {
        meshClicked(this._meshCode)

        // スタイル設定 // Check selection and set meshStyle for all polygons
        meshLayer.eachLayer(meshPolygon => {
          const selectedCode = isMeshCodeSelected(meshPolygon._meshCode);
          setMeshStyle(meshPolygon, meshSize, selectedCode);
        });
      });
      // メッシュをメッシュグループに追加
      meshLayer.addLayer(meshPolygon)
      
      // カウンタを加算
      latCounter++;
    }
    // カウンタを加算
    lonCounter++;
  }
}

// メッシュへジャンプ
function zoomToMesh(meshCode) {
  // メッシュのサイズを算出
  const meshSize = getMeshSizeFromMeshCode(meshCode);
  if (meshSize === null) { return; }

  // メッシュ配列を作成
  const meshArray = convertMeshCode_to_meshArray(meshCode);
  // メッシュの左下緯度経度を取得
  const [minLat, minLon] = getMeshMinLatlon(meshArray);
  // メッシュサイズに応じて、中心地点を算出
  const centerLat = minLat + (consts.MESH_DATA[meshSize].ratio.lat / 2);
  const centerLon = minLon + (consts.MESH_DATA[meshSize].ratio.lon / 2);
  // 対象メッシュを表示
  const zoomSize = consts.MESH_DATA[meshSize].defaultZoom;
  zoomToLatLon(centerLat, centerLon, zoomSize)
}

// メッシュコードからメッシュコード配列を取得
function convertMeshCode_to_meshArray(meshCode) {
  const meshArray = [];

  let tmpMeshCode = meshCode;
  let loopCounter = 0;
  // メッシュコードを配列に変換
  while (tmpMeshCode.length > 0) {
    const tmpMeshSplit = tmpMeshCode.slice(0, consts.MESH_DATA.MESH_ARRAY_LENGTH_LIST[loopCounter]);
    meshArray.push(tmpMeshSplit);
    tmpMeshCode = tmpMeshCode.replace(tmpMeshSplit, "");
    loopCounter += 1;
  }
  return meshArray;
}

// マーカーがある場合、削除
function removeLatLonMarker() {
  if (mapMeshSettings.searchMarker != null) {
    map.removeLayer(mapMeshSettings.searchMarker);
    mapMeshSettings.searchMarker == null;
  }
}

// 検索
function setLatLonMarker(searchLatlngArray, zoomSize) {
  // マーカーがある場合、削除
  removeLatLonMarker();
  // 検索地点にマーカーを立てる
  mapMeshSettings.searchMarker = new L.marker(searchLatlngArray).addTo(map);

  // 検索地点を表示
  zoomToLatLon(searchLatlngArray[0], searchLatlngArray[1], zoomSize)
}




//////////////////////////////////
// Helper Functions
//////////////////////////////////
function zoomToLatLon(lat, lon, zoom){
  map.setView([lat, lon], zoom);
  updateMapPositionCookie(lat, lon, zoom)
}

//--------------------------------
// メッシュコード関数 - meshSize functions
//--------------------------------
// メッシュコードからメッシュサイズを取得 //called from zoomToMesh
function getMeshSizeFromMeshCode(meshCode) { 
  if (meshCode.length === 4) { return 1; } 
  if (meshCode.length === 6) { return 2; } 
  if (meshCode.length === 8) { return 3; }
  return null;
}

// ズームレベルから表示するメッシュサイズを取得 //called from 94(setTextVisiblity), 433(setMeshLayer)
function getMeshSizeFromZoomSize() {
  let meshSize;

  const userSelected_meshSize = getUserSelectedMeshSize();
  if (userSelected_meshSize != "auto") { 
    meshSize = userSelected_meshSize 
  }
  else {
    let zoomSize = map.getZoom();
    
    if (zoomSize < 10) {
      meshSize = 1;
    } else if (zoomSize < 13) {
      meshSize = 2;
    } else {
      meshSize = 3;
    }
  }

  mapMeshSettings.meshSize = meshSize
  return meshSize;
}



//--------------------------------
// Lat Lon Functions
//--------------------------------
// 緯度経度からメッシュコード配列取得
// Mesh code Array is as follows:
// level 1 = [ latCode, lonCode ]
// level 2 = [ latCode, lonCode, y2, x2 ] (y2 and x2 are 0-7) divided by 64
// level 3 = [ latCode, lonCode, y2, x2, y3, x3 ] (y2 and x2 are 0-9) divided by 100
function getMeshCodeParts_fromLatLon(size, tgtLat, tgtLon) {
  var meshArray = [];

  const L1_lat = Math.floor(tgtLat * 60 / 40);
  const L1_lon = Math.floor(tgtLon - 100);
  meshArray.push(L1_lat, L1_lon);
  if (size == 1) { return meshArray }

  let offset_lat = (tgtLat * 60) % 40;
  let offset_lon = tgtLon - Math.floor(tgtLon)
  const L2_y = Math.floor(offset_lat / 5);    // a level 1 lat range is 40 minutes tall. divided into 8 pieces (40/8 = 5)
  const L2_x = Math.floor((offset_lon * 60) / 7.5); // a level 1 lon range is 60 minutes wide. convert to minutes first then divided into 8 pieces (60/8 = 7.5)
  meshArray.push(L2_y, L2_x);
  if (size == 2) { return meshArray }

  offset_lat = offset_lat % 5;
  offset_lon = (offset_lon * 60) % 7.5;
  const L3_y = Math.floor((offset_lat * 60) / 30); // level 2 lat range is 5 minutes tall, divide that to 10 pieces is 30 seconds (5min x 60 = 300secs) 300 in 10 pieces is 30
  const L3_x = Math.floor((offset_lon * 60) / 45); // level 2 lat range is 7.5 minutes tall, divide that to 10 pieces is 45 seconds (7.5min x 60 = 450secs) 450 in 10 pieces is 45
  meshArray.push(L3_y, L3_x);
  return meshArray;
}

// メッシュの左下緯度経度取得 - returns the southwest corner coordinates
function getMeshMinLatlon(meshArray) {
  let minLat = 0;
  let minLon = 100;

  // メッシュの最小緯度経度を算出
  for (let i = 0; i < meshArray.length; i = i + 2) {
    const meshLevel = (i/2)+1
    const latCode = meshArray[i];
    const lonCode = meshArray[i + 1];

    minLat += latCode * consts.MESH_DATA[meshLevel].ratio.lat;
    minLon += lonCode * consts.MESH_DATA[meshLevel].ratio.lon;
  }
  return [minLat, minLon];
}

// 日本のメッシュチェック
function checkLatlonInside(minLat, minLon, maxLat, maxLon) {
  if (
    consts.MESH_DATA.BOUNDARIES["lat"]["min"] <= minLat && maxLat <= consts.MESH_DATA.BOUNDARIES["lat"]["max"] &&
    consts.MESH_DATA.BOUNDARIES["lon"]["min"] <= minLon && maxLon <= consts.MESH_DATA.BOUNDARIES["lon"]["max"]
  ) {
    return true;
  } else {
    return false;
  }
}

//--------------------------------
// スタイル設定関数 - style and visibility
//--------------------------------
// メッシュスタイル設定
function setMeshStyle(meshPolygon, meshSize, selectedCode) {
  const zoomSize = map.getZoom();
  let lineWeight = 2
  if (zoomSize < consts.MESH_DATA[meshSize].zoomThresholds[1]){
    lineWeight = 0
  }
  else if (zoomSize < consts.MESH_DATA[meshSize].zoomThresholds[0]){
    lineWeight = 1
  }

  let meshFillColor;
  switch (selectedCode) {
    case consts.SELECTCODE.not_selected: // not selected
      meshFillColor = consts.COLORS.MESH.default_fill;
      break;
    case consts.SELECTCODE.selected: // selected
      meshFillColor = consts.COLORS.MESH.selected_fill;
      break;
    case consts.SELECTCODE.partially_selected: //partly selected
      meshFillColor = consts.COLORS.MESH.partlySelected_fill;
      break;
  }
  meshPolygon.setStyle({
    color: consts.COLORS.MESH.gridline, // gird line color
    fillColor: meshFillColor, // inner square fill color
    fillOpacity: 0.2,
    weight: lineWeight,
  });
  return meshPolygon;
}

// ズームレベルからメッシュ内のテキスト表示／非表示を取得
function setMeshTextVisiblity() {
  var meshSize = getMeshSizeFromZoomSize();
  var zoomSize = map.getZoom();
  if (meshSize == 1 && zoomSize >= 7) {
    mapMeshSettings.textVisiblity = true;
    return
  }
  if (meshSize == 2 && zoomSize >= 10) {
    mapMeshSettings.textVisiblity = true;
    return
  }
  if (meshSize == 3 && zoomSize >= 13) {
    mapMeshSettings.textVisiblity = true;
    return
  }
  mapMeshSettings.textVisiblity = false;
}


// メッシュにマウスオンした際のスタイルを設定
function setMouseOverOutStyle(layer, meshSize, isOver) {
  const zoomSize = map.getZoom();
  let lineWeight = isOver? 4: 2;
  if (zoomSize < consts.MESH_DATA[meshSize].zoomThresholds[1]){
    lineWeight = isOver? 1: 0;
  }
  else if (zoomSize < consts.MESH_DATA[meshSize].zoomThresholds[0]){
    lineWeight = isOver? 2: 1;

  }
  layer.setStyle({
    weight: lineWeight,
  });
  return layer;
}

// メッシュテキスト設定
function setMeshText(meshPolygon, mouseOnFlg) {
  // テキスト表示を解除 -unbinds any perment text
  meshPolygon.unbindTooltip();

  let tipClassName;
  switch (mouseOnFlg) {
    case true:
      tipClassName = "leaflet-tooltip_mouseon"; //bold text style
      break;
    case false:
      tipClassName = "leaflet-tooltip_base"; //no bold text style
      break;
  }
  meshPolygon.bindTooltip(meshPolygon._meshCode, {
    permanent: true,
    direction: "center",
    className: tipClassName,
  });
  return meshPolygon;
}

//////////////////////////////////
// Exports
//////////////////////////////////
export { 
  initMapGenerator, 
  updateMapMeshes, 
  zoomToMesh, 
  convertMeshCode_to_meshArray, 
  removeLatLonMarker, 
  setLatLonMarker
};