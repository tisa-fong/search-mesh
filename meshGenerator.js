import * as consts from "./consts.js"

// function export list is at the bottom
//This generates meshes on a leaflet map based on the Japanese mesh system

//////////////////////////////////
// Global Variables
//////////////////////////////////
const mapMeshSettings = {
  meshSize: 1,
  layerCache: {},
  textVisiblity: false, // メッシュのテキスト表示
  searchMarker_1: null, // 検索時のマーカーを準備
  searchMarker_2: null, // 検索時のマーカーを準備
}
const searchMarker = "searchMarker"

let map = null
let canvasRenderer = null 
let meshLayer = null

let userSelectedMeshSize = null;
let isMeshCodeSelected = null;
let meshClicked = null;
let updateMapPositionCookie = null;

const nextFrame = () => new Promise(requestAnimationFrame);
let currentJobId = 0;
const FRAME_BUDGET_MS = 32; // adaptive time budget per frame: try to keep under ~32ms per frame for smooth 15fps

//////////////////////////////////
// Exported Functions - see list(and export) at the bottom of this file
//////////////////////////////////
function initMapGenerator(   
    _isMeshCodeSelected,
    _meshClicked,
    _updateMapPositionCookie,
  ){
  // get updated consts data into Settings
  userSelectedMeshSize = consts.DOMs.DOM_userSelected_meshSize.value;
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
    updateMap();
    updateMapPositionCookie(map.getCenter().lat, map.getCenter().lng, map.getZoom())
  });

  updateMap();
}

// メッシュレイヤー表示
function updateMap() {
  // 前回のメッシュ表示を削除
  // meshLayer.clearLayers();
  updateMap_markerMesh()
  updateMap_mesh()
}

function updateMap_markerMesh(){
  // If either searchMarker is not set, remove the marker layer
  if ((mapMeshSettings.searchMarker_1 == null) || (mapMeshSettings.searchMarker_2 == null)){
    if (mapMeshSettings.layerCache[searchMarker] != null){
      meshLayer.removeLayer(mapMeshSettings.layerCache[searchMarker])
      mapMeshSettings.layerCache[searchMarker] = null
    }
    return; 
  }

  let minLat, maxLat, minLon, maxLon;
  if (mapMeshSettings.searchMarker_2._latlng.lat > mapMeshSettings.searchMarker_2._latlng.lat){
    minLat = mapMeshSettings.searchMarker_2._latlng.lat
    maxLat = mapMeshSettings.searchMarker_1._latlng.lat
  } else {
    minLat = mapMeshSettings.searchMarker_1._latlng.lat
    maxLat = mapMeshSettings.searchMarker_2._latlng.lat
  }
  if (mapMeshSettings.searchMarker_2._latlng.lng > mapMeshSettings.searchMarker_2._latlng.lng){
    minLon = mapMeshSettings.searchMarker_2._latlng.lng
    maxLon = mapMeshSettings.searchMarker_1._latlng.lng
  } else {
    minLon = mapMeshSettings.searchMarker_1._latlng.lng
    maxLon = mapMeshSettings.searchMarker_2._latlng.lng
  }

  if (mapMeshSettings.layerCache[searchMarker] != null){
    const currentBounds = mapMeshSettings.layerCache[searchMarker].getBounds().toBBoxString()
    const newBounds = `${minLon},${maxLat},${maxLon},${minLat}`
    if (currentBounds == newBounds){
      return; // mesh already added and being displayed
    }
    meshLayer.removeLayer(mapMeshSettings.layerCache[searchMarker])
    mapMeshSettings.layerCache[searchMarker] = null
  }

  const markerPolygon = createMeshRect(minLat, minLon, maxLat, maxLon)
  markerPolygon._meshCode = searchMarker  
  meshLayer.addLayer(markerPolygon)
  markerPolygon.bringToBack();

  mapMeshSettings.layerCache[searchMarker] = markerPolygon
}

async function updateMap_mesh() {
  const myJobId = ++currentJobId;          // cancellation token

  // ズームレベルから表示するメッシュサイズを取得 // ズームレベルからメッシュ内のテキスト表示／非表示を設定
  const meshSize = getMeshSizeFromZoomSize();
  setMeshTextVisiblity();

  let meshPolygonsToDisplay = await getMeshPolygonsToDisplay_inChunks(myJobId, meshSize)
  if (myJobId !== currentJobId) return;

  meshPolygonsToDisplay = await filterAndRemovePolygonsToDisplay_inChunks(myJobId, meshPolygonsToDisplay)
  if (myJobId !== currentJobId) return;

  await addRemainingPolygonsToDisplay_inChunks(myJobId, meshSize, meshPolygonsToDisplay)
  if (myJobId !== currentJobId) return;

  updateStylesOfExistingPolygons_inChunks(myJobId, meshSize)
}
//--------------------------------
// updateMap_mesh Chunks START
//--------------------------------
async function getMeshPolygonsToDisplay_inChunks(myJobId, meshSize){
  // 表示中の緯度経度範囲を取得 
  const bounds = map.getBounds();
  const bound_northLat = bounds.getNorthEast().lat;
  const bound_southLat = bounds.getSouthWest().lat;
  const bound_eastLon  = bounds.getNorthEast().lng;
  const bound_westLon  = bounds.getSouthWest().lng;

  // 南西のメッシュコードを取得 // 南西のメッシュコードの最小緯度経度を取得
  const minMeshArray = getMeshCodeParts_fromLatLon(meshSize, bound_southLat, bound_westLon);
  const [minMeshMinLat, minMeshMinLon] = getMeshMinLatlon(minMeshArray);

  // メッシュの一辺の緯度経度サイズ配列取得
  const meshLatUnit = consts.MESH_DATA[meshSize].ratio.lat;
  const meshLonUnit = consts.MESH_DATA[meshSize].ratio.lon;

  // 西端から東端までループ
  const meshPolygonsToDisplay = {}
  let lonCounter = 0;
  var latCounter = 0;
  let done = false; // for inner loop to exit out of outer loop

  while (!done) {
    const frameStart = performance.now();
    // Scan visible window and build the "to display" set in chunks
    // Do as much work in this frame as budget allows
    while (performance.now() - frameStart < FRAME_BUDGET_MS && !done) {
      // 現在の経度を算出 calculate the longitude
      const currMeshMinLon = minMeshMinLon + (meshLonUnit * lonCounter);
      const currMeshMaxLon = currMeshMinLon + meshLonUnit;
      if (currMeshMinLon > bound_eastLon) { done = true; break; } // finished across

      // 南端から北端までループ // 現在の緯度を算出
      const currMeshMinLat = minMeshMinLat + meshLatUnit * latCounter;
      const currMeshMaxLat = currMeshMinLat + meshLatUnit;
      if (currMeshMinLat > bound_northLat) {
        lonCounter++;
        latCounter = 0;
        continue; // finished vertically
      } 

      // 日本のメッシュチェック
      if (!checkLatlonInside(currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon)) { 
        latCounter++;
        continue;
      }

      // 現在のメッシュの中央の緯度経度を算出
      const currMeshCenterLat = currMeshMinLat + (meshLatUnit / 2);
      const currMeshCenterLon = currMeshMinLon + (meshLonUnit / 2);
      // 現在のメッシュコードを取得
      const currMeshCode = getMeshCodeParts_fromLatLon(
        meshSize,
        currMeshCenterLat,
        currMeshCenterLon
      ).join("");

      // メッシュポリゴン生成
      let meshPolygon = mapMeshSettings.layerCache[currMeshCode];
      if (!meshPolygon) {
        meshPolygon = createMeshPolygon(
          meshSize, currMeshCode,
          currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon
        );
        mapMeshSettings.layerCache[currMeshCode] = meshPolygon
      }
      meshPolygonsToDisplay[currMeshCode] = meshPolygon;
      
      // カウンタを加算
      latCounter++;
    }

    // Yield to the browser for paint/input
    await nextFrame();
    if (myJobId !== currentJobId) return; // cancelled by a newer call
  }

  return meshPolygonsToDisplay
}

async function filterAndRemovePolygonsToDisplay_inChunks(myJobId, meshPolygonsToDisplay){  
  // Diff currently rendered vs toDisplay in chunks
  // loop thru currently rendered polygons
  // keep in the meshLayer     : the polygons in meshPolygonsToDisplay and remove from meshPolygonsToDisplay
  // remove from the meshLayer : the polygons NOT in meshPolygonsToDisplay
  // add to the meshLayer      : the remaining from meshPolygonsToDisplay
  const existingLayers = meshLayer.getLayers(); // array snapshot
  let i = 0;
  while (i < existingLayers.length) {
    const frameStart = performance.now();
    while (performance.now() - frameStart < FRAME_BUDGET_MS && i < existingLayers.length) {
      const _mPolygon = existingLayers[i++];
      if (meshPolygonsToDisplay[_mPolygon._meshCode] != null) {
        delete meshPolygonsToDisplay[_mPolygon._meshCode]; // Already displayed: remove from "to add" set
      }
      else if (_mPolygon._meshCode === searchMarker) { } // keep searchMarker
      else {
        meshLayer.removeLayer(_mPolygon); // Not in current view: remove this layer
      }
    }
    await nextFrame();
    if (myJobId !== currentJobId) return;
  }

  return meshPolygonsToDisplay
}
async function addRemainingPolygonsToDisplay_inChunks(myJobId, meshSize, meshPolygonsToDisplay){
  // Add remaining polygons in chunks
  const polygonsToAddList = Object.values(meshPolygonsToDisplay);
  let idx = 0;
  while (idx < polygonsToAddList.length) {
    const frameStart = performance.now();
    while (performance.now() - frameStart < FRAME_BUDGET_MS && idx < polygonsToAddList.length) {
      const tgtPolygon = polygonsToAddList[idx++]

      // 選択したメッシュの行番号を取得 // スタイル設定 // テキスト表示設定
      const selectedCode = isMeshCodeSelected(tgtPolygon._meshCode);
      setMeshStyle(tgtPolygon, meshSize, selectedCode);
      setMeshText(tgtPolygon, false);

      meshLayer.addLayer(tgtPolygon);
    }
    await nextFrame();
    if (myJobId !== currentJobId) return;
  }
}
async function updateStylesOfExistingPolygons_inChunks(myJobId, meshSize){
  // Style & text updates in chunks
  const layers = meshLayer.getLayers();
  let idx = 0;
  while (idx < layers.length) {
    const frameStart = performance.now();
    while (performance.now() - frameStart < FRAME_BUDGET_MS && idx < layers.length) {
      const _mPolygon = layers[idx++];
      const selectedCode = isMeshCodeSelected(_mPolygon._meshCode);
      setMeshStyle(_mPolygon, meshSize, selectedCode);
      setMeshText(_mPolygon, false);
    }
    await nextFrame();
    if (myJobId !== currentJobId) return;
  }
}
//--------------------------------
// updateMap_mesh Chunks END
//--------------------------------

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
function removeLatLonMarker(markerNum) {
  const marker = `searchMarker_${markerNum}`
  if (mapMeshSettings[marker] != null) {
    map.removeLayer(mapMeshSettings[marker]);
    mapMeshSettings[marker] = null;
  }
}

// 検索
function setLatLonMarker(markerNum, searchLatlngArray, zoomSize) {
  const marker = `searchMarker_${markerNum}`
  // マーカーがある場合、削除
  removeLatLonMarker(markerNum);
  // 検索地点にマーカーを立てる
  mapMeshSettings[marker] = new L.marker(searchLatlngArray).addTo(map);

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

function createMeshPolygon(meshSize, currMeshCode, currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon){
  // メッシュポリゴン生成
  const meshPolygon = createMeshRect(currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon)
  meshPolygon._meshCode = currMeshCode; // Store meshcode on itself
  meshPolygon._meshFillColor = null
  meshPolygon._lineWeight = null
  
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
    meshLayer.eachLayer(_mPolygon => {
      const selectedCode = isMeshCodeSelected(_mPolygon._meshCode);
      setMeshStyle(_mPolygon, meshSize, selectedCode);
    });
  });
  return meshPolygon
}

function createMeshRect(currMeshMinLat, currMeshMinLon, currMeshMaxLat, currMeshMaxLon){
  const cellBounds = [[currMeshMinLat, currMeshMinLon], [currMeshMaxLat, currMeshMaxLon]];
  return L.rectangle(cellBounds, {
    // renderer: canvasRenderer
  });
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
  const userSelected_meshSize = consts.DOMs.DOM_userSelected_meshSize.value
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
  if (meshPolygon._meshCode == searchMarker) { return meshPolygon; /*Do nothing*/ }

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

  if ((meshPolygon._meshFillColor != meshFillColor) || (meshPolygon._lineWeight != lineWeight)){
    meshPolygon._meshFillColor = meshFillColor
    meshPolygon._lineWeight = lineWeight
    meshPolygon.setStyle({
      color: consts.COLORS.MESH.gridline, // gird line color
      fillColor: meshFillColor, // inner square fill color
      fillOpacity: 0.2,
      weight: lineWeight,
    });
  }
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
  if (meshPolygon._meshCode == searchMarker) { return; /*Do nothing*/ }

  if (mapMeshSettings.textVisiblity){
    if (meshPolygon.getTooltip()) {
      return
    }

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
  }
  else {
    if (meshPolygon.getTooltip()) {
      // テキスト表示を解除 -unbinds any perment text
      meshPolygon.unbindTooltip(); 
      return
    }
  }
}

//////////////////////////////////
// Exports
//////////////////////////////////
export { 
  initMapGenerator, 
  updateMap, 
  zoomToMesh, 
  convertMeshCode_to_meshArray, 
  removeLatLonMarker, 
  setLatLonMarker
};