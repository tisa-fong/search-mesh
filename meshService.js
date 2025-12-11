import * as consts from "./meshConsts.js"
import * as mapGenerator from "./meshGenerator.js"

//////////////////////////////////
// Functions
//////////////////////////////////
//---------------------------------
// helper Functions
//---------------------------------
function isNumeric(str) {
  return str !== "" && !isNaN(str);
}

// メッシュコードにハイフン付与
function addHyphen(meshCode) {
  let hyphenMeshCode = "";
  // 文字列内の文字を順に処理
  for (let i = 0; i < meshCode.length; i++) {
    if (i === 4 || i === 6) {
      // 5桁目、7桁目の追加前にハイフンを付与
      hyphenMeshCode += "-";
    }
    // 文字を追加
    hyphenMeshCode += meshCode.charAt(i);
  }
  return hyphenMeshCode;
}

//---------------------------------
// MeshSize Select Functions
//---------------------------------
// メッシュコードの不正をチェック
function checkMeshCode(meshArrayList) {
  // 配列をチェック
  for (let i = 0; i < meshArrayList.length; i++) {
    // メッシュコードが数値でない場合は返却
    if (isNaN(meshArrayList[i])) {
      return false;
    }
    // メッシュコードが範囲内かどうかチェック
    const tmpMeshInt = Number(meshArrayList[i]);
    const tgtMeshSize = Math.floor(i / 2) + 1;
    const latlon = i % 2 == 0? "lat": "lon"
    if (
      !(tmpMeshInt >= consts.MESH_DATA[tgtMeshSize].boundary[latlon][0] &&
        tmpMeshInt <= consts.MESH_DATA[tgtMeshSize].boundary[latlon][1])
    ) {
      return false;
    }
  }
  return true;
}

//---------------------------------
// 緯度経度検索関数 LatLon Search Functions
//---------------------------------
function getTargetLatlonDOM(latlonNum){
  let targetLatlonDom = null
  switch (latlonNum) {
    case 1:
      targetLatlonDom = DOM_latlon_input_1
      break;
    case 2:
      targetLatlonDom = DOM_latlon_input_2
      break;
  }
  return targetLatlonDom
}
function updateLatLonCookie(latlonNum, targetLatlonDom){
  switch (latlonNum) {
    case 1:
      setCookie(consts.DOM_IDS.latlng_input_1, targetLatlonDom.value)
      break;
    case 2:
      setCookie(consts.DOM_IDS.latlng_input_2, targetLatlonDom.value)
      break;
  }
}
// 検索削除
function clearLatLonSearch(latlonNum) {
  const tgtLatlonDom = getTargetLatlonDOM(latlonNum)
  mapGenerator.removeLatLonMarker(latlonNum); // マーカーがある場合、削除

  // Clear the text box
  tgtLatlonDom.value = "";
  updateLatLonCookie(latlonNum, tgtLatlonDom)

  mapGenerator.updateMapMeshes()
}

function setLatLonSearch(latlonNum) {
  const tgtLatlonDom = getTargetLatlonDOM(latlonNum)

  // 入力値を取得
  const tgtLatLonString = tgtLatlonDom.value.trim();
  const tgtLatLonArray = tgtLatLonString.split(",");
  if (
    (tgtLatLonArray.length != 2) ||
    (!isNumeric(tgtLatLonArray[0])) || (!isNumeric(tgtLatLonArray[1]))
   ) {
    alert("不正の緯度経度: " + meshErrorArray);
  }
  
  const searchLatlngArray = [
    parseFloat(tgtLatLonArray[0]),
    parseFloat(tgtLatLonArray[1]),
  ];

  mapGenerator.setLatLonMarker(latlonNum, searchLatlngArray, consts.LATLON_SEARCHZOOM)
  updateLatLonCookie(latlonNum, tgtLatlonDom)

  mapGenerator.updateMapMeshes()
}


//---------------------------------
// テーブル操作関数 mesh Table Button Functions
//---------------------------------
// テーブルのハイフン有無を切り替え
function changeMeshHyphen(hyphen_selection) {
  // テーブル取得
  // 末尾まで行を順に処理
  for (let i = 0; i <= DOM_userSelected_meshTable.rows.length; i++) {
    const row = DOM_userSelected_meshTable.rows[i]
    if (!row){ break; }
    
    // 元のテキストを取得
    const original_text = row.cells[0].innerText;
    // ハイフンありにした場合
    if (hyphen_selection.includes("-")) {
      // 元のテキストにハイフンがない場合のみ付与処理
      if (!original_text.includes("-")) {
        // ハイフン付きのメッシュコードを取得し、置き換え
        row.cells[0].innerText = addHyphen(original_text);
      }
      // ハイフンなしにした場合
    } else {
      // ハイフンを除去
      row.cells[0].innerText = original_text.replace(/-/g, "");
      
    }
  }
  setCookie(consts.DOM_IDS.select_hyphen, hyphen_selection)
}

// メッシュリストを並べ替え
function sortTable(sortOrder) {
  //sort
  const rows = Array.from(DOM_userSelected_meshTable.rows)
  if (sortOrder == "asc"){
    rows.sort((a, b) => {
      const valA = a.cells[0].textContent; // first column
      const valB = b.cells[0].textContent;
      if (valA == "") { return true }
      if (valB == "") { return false }
      return valA.localeCompare(valB); // string comparison
    });
  }
  else if (sortOrder == "desc"){
    rows.sort((a, b) => {
      const valA = a.cells[0].textContent; // first column
      const valB = b.cells[0].textContent;
      if (valA == "") { return true }
      if (valB == "") { return false }
      return valB.localeCompare(valA); // string comparison
    });
  }
  else { return; }
  rows.forEach(row => DOM_userSelected_meshTable.appendChild(row)); // re-append in order
}

// テーブルクリア
function clearTable() {
  // テーブルの行削除
  DOM_userSelected_meshTable.innerHTML = ""
  // テーブルに行を追加
  for (let i = 0; i < consts.TABLE_MIN_ROW; i++) {
    insertRowToTable(DOM_userSelected_meshTable);
  }
  mapGenerator.updateMapMeshes()
  updateSelectedMeshCounter();
  saveMeshList()
}

// メッシュ貼り付け
function pasteMeshList() {
  // 貼り付けたメッシュのうち、最初のメッシュを保持（中心へジャンプのため）
  let pasteFirstMeshCode = null;
  // クリップボードの値を取得
  navigator.clipboard.readText().then((clipText) => {
      // 貼り付けたテキストを¥r¥nで分割 - split based on new lines
      // タブで分割 - then further splits by tabs
      const splitRows = clipText.split(/\r\n|\n|\r/).map(row => row.split('\t')[0]);

      // メッシュ不正リストを作成
      const meshErrorArray = [];
      for (let currMeshCode of splitRows){
        if (currMeshCode == "") { continue; } // skip if empty

        // ハイフンを除去
        currMeshCode = currMeshCode.replace(/-/g, "");
        
        // メッシュコードに該当するもののみ追加
        if (isNumeric(currMeshCode) && 
           (currMeshCode.length === 4 || currMeshCode.length === 6 || currMeshCode.length === 8)
        ) {
          // メッシュコードが正しい場合のみテーブルに追加
          const currMeshArray = mapGenerator.convertMeshCode_to_meshArray(currMeshCode);
          if (checkMeshCode(currMeshArray)) {
            // メッシュコードがすでにテーブルに存在するか確認
            const selectedCode = isMeshCodeSelected(currMeshCode);
            if (selectedCode == consts.SELECTCODE.not_selected){ // case 0: not selected
              // console.log(currMeshCode)
              // 存在しない場合のみ追加
              insertMeshCodeToTable(currMeshCode);
              // 貼り付けた値の先頭の場合、値を保持 - the first item in the list is zoomed to at the end
              if (pasteFirstMeshCode === null) {
                pasteFirstMeshCode = currMeshCode;
              }
            }
            else if (selectedCode == consts.SELECTCODE.partially_selected){ // case 2: partly selected
              insertMeshCodeToTable(currMeshCode);
              removeMeshCodeFromTable(currMeshCode)
            }
          } else {
            meshErrorArray.push(currMeshCode);
          }
        } else {
          meshErrorArray.push(currMeshCode);
        }
      }
      if (pasteFirstMeshCode != null) {
        // 貼り付けた先頭のメッシュを表示
        mapGenerator.zoomToMesh(pasteFirstMeshCode);
        // updateMapMeshes()
      }
      if (meshErrorArray.length > 0) {
        alert("貼り付けメッシュコード不正: " + meshErrorArray);
      }
      updateSelectedMeshCounter();
    }
  );
}

// メッシュリストコピー
function copyMeshList() {
  let tableTexts = "";
  // 末尾まで行を順に処理
  for (const row of DOM_userSelected_meshTable.rows) {
    const currText = row.cells[0].innerText;
    if (currText != "") {
      // データがある場合は、テキストに追加
      tableTexts += currText + "\r\n";
    }
  }
  // テキストをクリップボードへコピー
  navigator.clipboard.writeText(tableTexts);
}

// 選択したメッシュ数をテーブルの下部にを更新して表示
function updateSelectedMeshCounter() {
  const tableRowAmount = DOM_userSelected_meshTable.rows.length;
  let countMeshNum = 0;
  if (tableRowAmount > 5){
    countMeshNum = tableRowAmount
  }
  else {
    for (let i = 0; i < tableRowAmount; i++) {
      // テーブル内のメッシュ数を加算
      if (DOM_userSelected_meshTable.rows[i].cells[0].innerText.length > 0) {
        countMeshNum += 1;
      }
    }
  }

  // 選択したメッシュ数をカウント
  DOM_meshTable_selectedMeshCounter.innerText = `選択済みメッシュ数: ${countMeshNum}`;
}


//---------------------------------
// mesh Table Functions
//---------------------------------
function isMeshCodeSelected(meshCode) {
  for (let i = 0; i < DOM_userSelected_meshTable.rows.length; i++) {
    // テーブル内のメッシュからハイフンを除去して取得
    const rowMeshCode = DOM_userSelected_meshTable.rows[i].cells[0].innerText.replace(/-/g, "");
    // 該当するメッシュの場合、行番号を返却
    if (rowMeshCode.trim() != ""){
      if (
        (rowMeshCode == meshCode) ||
        (meshCode.startsWith(rowMeshCode)) // 5733.startsWith(573336) F, 573336.startsWith(5733) T
      ){ return consts.SELECTCODE.selected; } // case 1: selected
      else if (
        (rowMeshCode.startsWith(meshCode)) // 573336.startsWith(5733) T, 5733.startsWith(573336) F
      ){ return consts.SELECTCODE.partially_selected; } // case 2: partly selected
    }
  }
  return consts.SELECTCODE.not_selected; // case 0: not selected
}

const meshClicked = (meshCode) => {
  // check if the mesh is selected
  const isSelected = isMeshCodeSelected(meshCode)

  // if not selected insert it into the table
  if (isSelected == consts.SELECTCODE.not_selected) { 
    insertMeshCodeToTable(meshCode);
  } else {
  // if selected remove from table
    removeMeshCodeFromTable(meshCode)
  }

  // 選択メッシュ数を表示
  updateSelectedMeshCounter();
}


// 選択したメッシュをテーブルに追加
// Inserts a meshCode into the table, table has min rows of 5, if any of those 5 are empty use it, otherwise add row.
function insertMeshCodeToTable(meshCode) {
  const meshSizeDict = consts.MESH_DATA_FROM_LENGTH[meshCode.length]

  if (meshSizeDict.level == 1){ //(ex 5433) size 1 goes straight to add
    insertMeshCodeToTable_inner(meshCode)
  }
  else{ 
    const upperLevelMeshCode = meshCode.substring(0, meshCode.length-2) // if 2 > 6-2=4, if 3 > 8-2=6
    let count = 1 //include the new one to be added
    for (const row of DOM_userSelected_meshTable.rows){
      if (row.cells[0].innerText.startsWith(upperLevelMeshCode)){
        count++
      }
    }
    if (count >= meshSizeDict.maxParts){
      removeMeshCodeFromTable(upperLevelMeshCode)
      insertMeshCodeToTable(upperLevelMeshCode)
    } else {
      insertMeshCodeToTable_inner(meshCode)
    }
  }
  saveMeshList()
}
function insertMeshCodeToTable_inner(text){
  let meshCode = text
  const inputCellIndex = getTableEmptyRowOrAddNewRow();

  // セルを追加 - get the cell in the row
  const tgtCell = DOM_userSelected_meshTable.rows[inputCellIndex].cells[0];
  // ハイフン有無の選択状態を取得 - add hyphens if needed
  if (DOM_userSelected_meshTable_hyphenSelect.value.includes("-")) {
    // -ありの場合、メッシュコードにハイフンを付与
    meshCode = addHyphen(meshCode);
  }
  // メッシュコードを記入 -update the cell with the meshCode
  tgtCell.innerText = meshCode;

  // マウスオンを設定
  tgtCell.addEventListener("mouseover", function (e) {
    e.target.style.background = consts.COLORS.TABLE.mouseOver;
  });
  tgtCell.addEventListener("mouseleave", function (e) {
    e.target.style.background = consts.COLORS.TABLE.mouseLeave;
  });
  // クリックイベントを付与
  tgtCell.addEventListener("click", function (e) { 
    // メッシュにズーム
    const tgtMeshCode = e.currentTarget.innerText.replace(/-/g, "");
    if ((tgtMeshCode == null) || (tgtMeshCode == "")) { return; }
    mapGenerator.zoomToMesh(tgtMeshCode);
  });
}
function getTableEmptyRowOrAddNewRow(){
  const rowAmount = DOM_userSelected_meshTable.rows.length;
  let inputCellIndex = -1;
  // テーブル内容が空の行を探索 - if available find an empty space to enter the meshCode
  if (rowAmount <= 5){ //only perform check if 5 or less items in the table
    for (let i = 0; i < rowAmount; i++) {
      const cellText = DOM_userSelected_meshTable.rows[i].cells[0].innerText;
      if (cellText.length == 0) {
        // セルの中身が空の場合、対象行とする
        inputCellIndex = i;
        break;
      } 
    }
  }
  // 行数が不足する場合は付与 -if no free rows found, add a row
  if (inputCellIndex == -1) {
    insertRowToTable(DOM_userSelected_meshTable);
    inputCellIndex = rowAmount
  }
  return inputCellIndex
}
// テーブルの行数が不足する際に追加
function insertRowToTable(meshTable) {
  const insertRow = meshTable.insertRow(-1); //adds row to the end of the table
  insertRow.insertCell(-1);
  return meshTable;
}



function removeMeshCodeFromTable(meshCode){
  const meshSizeDict = consts.MESH_DATA_FROM_LENGTH[meshCode.length]
  //check if its parent meshCode
  if (meshSizeDict.size == 1){
    removeMeshCodeFromTable_inner(meshCode)
  }
  else {
    //cacade to top level if needed, skipping self size
    for (const meshSizeLength in consts.MESH_DATA_FROM_LENGTH){
      if (meshCode.length == meshSizeLength) { break }

      const upperLevelMeshCode = meshCode.substring(0, meshSizeLength);
      const currLevelMeshCode = meshCode.substring(0, (Number(meshSizeLength)+2));
      let upperLevelCodeFound = false
      for (const row of DOM_userSelected_meshTable.rows){
        const rowMeshCode = row.cells[0].innerText.replace(/-/g, "");
        if (rowMeshCode == upperLevelMeshCode){
          upperLevelCodeFound = true
          break
        }
      }
      if (upperLevelCodeFound){
        removeMeshCodeFromTable_unGroupUpperLevel(upperLevelMeshCode, currLevelMeshCode)
      }
    }
    removeMeshCodeFromTable_inner(meshCode)
  }
  saveMeshList()
}
function removeMeshCodeFromTable_unGroupUpperLevel(upperLevelMeshCode, currLevelMeshCode){
  //remove upper mesh size selection
  removeMeshCodeFromTable(upperLevelMeshCode)
  // add all parts except the target meshCode to be removed
  // console.log(`${meshSizesFromLength[currLevelMeshCode.length].partsLength}, ${currLevelMeshCode.length} ][ ${upperLevelMeshCode}, ${currLevelMeshCode}`)
  for (let x = 0; x < consts.MESH_DATA_FROM_LENGTH[currLevelMeshCode.length].partsLength; x++){
    for (let y = 0; y < consts.MESH_DATA_FROM_LENGTH[currLevelMeshCode.length].partsLength; y++){
      const meshLoop = `${upperLevelMeshCode}${x}${y}`
      insertMeshCodeToTable_inner(meshLoop)
    }
  }
}
function removeMeshCodeFromTable_inner(meshCode){
  const removeList = []
  for (let i = 0; i < DOM_userSelected_meshTable.rows.length; i++) {
    // テーブル内のメッシュからハイフンを除去して取得
    const rowMeshCode = DOM_userSelected_meshTable.rows[i].cells[0].innerText.replace(/-/g, "");
    // 該当するメッシュの場合、行番号を返却
    if (rowMeshCode.trim() != "") { 
      if (
        (rowMeshCode.startsWith(meshCode))
      ) {
        removeList.push(i)
      }
    }
  }
  removeList.sort((a, b) => b - a); // reverse sort
  for (const idx of removeList) {
    removeIndexFromTable(idx);
  }
}

// 選択したメッシュをテーブルから削除
function removeIndexFromTable(rowIdx){
  // 対象行を削除
  DOM_userSelected_meshTable.deleteRow(rowIdx);
  // 削除した結果、最小行数未満の場合は、末尾に行追加
  const currRowNum = DOM_userSelected_meshTable.rows.length;
  if (currRowNum < consts.TABLE_MIN_ROW) {
    insertRowToTable(DOM_userSelected_meshTable)
  }
  // 選択したメッシュ数を表示
  updateSelectedMeshCounter();
}

//---------------------------------
// cookie Functions
//---------------------------------
function setCookie(key, val){
  document.cookie = `${key}=${val}; Max-Age=${consts.COOKIE_SETTINGS.expiry}; path=/`
}
function _updateMapPositionCookie(lat, lon, zoom){
  setCookie(consts.DOM_IDS.STARTING_POSITION_COOKIE_NAME, `${lat},${lon},${zoom}`)
}
function meshSizeUpdated(){
  mapGenerator.updateMapMeshes()
  setCookie(consts.DOM_IDS.select_meshlevel, DOM_userSelected_meshSize.value)
}
function saveMeshList(){
  let cookieCount = 0;
  let meshCount = 0;
  let meshList = "";

  const rows = DOM_userSelected_meshTable.rows;
  for (const row of rows){
    const rowMeshCode = row.cells[0].innerText.replace(/-/g, "").trim()
    if (rowMeshCode == ""){
      continue
    }
    else if (meshList == ""){
      meshList = rowMeshCode
    } else {
      meshList = `${meshList},${rowMeshCode}`
    }

    meshCount = meshCount + 1
    if (meshCount >= consts.COOKIE_SETTINGS.meshCode_count_perCookie){
      setCookie(`${consts.DOM_IDS.meshlist_table}_${cookieCount}`, meshList)
      meshCount = 0
      meshList = ""
      cookieCount = cookieCount + 1
      if (cookieCount >= consts.COOKIE_SETTINGS.meshCode_count) { break }
    }
  }

  // write/clear out the rest of the cookies
  for (; cookieCount < consts.COOKIE_SETTINGS.meshCode_count; cookieCount++){ 
    setCookie(`${consts.DOM_IDS.meshlist_table}_${cookieCount}`, meshList)
    meshList = ""
  }
}



function test() {
  // save a cookie
  document.cookie = `${consts.DOM_IDS.latlng_input_1}=hello world; Max-Age=${consts.COOKIE_SETTINGS.expiry}; path=/`
  document.cookie = `${consts.DOM_IDS.latlng_input_2}=bye world; Max-Age=${consts.COOKIE_SETTINGS.expiry}; path=/`
  
  
}
function test2(){
  saveMeshList()
}

//////////////////////////////////
// initialization
//////////////////////////////////
//---------------------------------
// init Constants
//---------------------------------
const DOM_userSelected_meshSize = document.getElementById(consts.DOM_IDS.select_meshlevel);
const DOM_latlon_input_1 = document.getElementById(consts.DOM_IDS.latlng_input_1);
const DOM_clearMarkerBtn_1 = document.getElementById(consts.DOM_IDS.clearMarkerBtn_1);
const DOM_zoomToPointBtn_1 = document.getElementById(consts.DOM_IDS.zoomToPointBtn_1);
const DOM_latlon_input_2 = document.getElementById(consts.DOM_IDS.latlng_input_2);
const DOM_clearMarkerBtn_2 = document.getElementById(consts.DOM_IDS.clearMarkerBtn_2);
const DOM_zoomToPointBtn_2 = document.getElementById(consts.DOM_IDS.zoomToPointBtn_2);
const DOM_userSelected_meshTable = document.getElementById(consts.DOM_IDS.meshlist_table);
const DOM_meshTable_selectedMeshCounter = document.getElementById(consts.DOM_IDS.selected_mesh_count);
const DOM_userSelected_meshTable_hyphenSelect = document.getElementById(consts.DOM_IDS.select_hyphen);
const DOM_sortAscBtn = document.getElementById(consts.DOM_IDS.sortAscBtn);
const DOM_sortDescBtn = document.getElementById(consts.DOM_IDS.sortDescBtn);
const DOM_clearBtn = document.getElementById(consts.DOM_IDS.clearBtn);
const DOM_pasteBtn = document.getElementById(consts.DOM_IDS.pasteBtn);
const DOM_copyBtn = document.getElementById(consts.DOM_IDS.copyBtn);

//---------------------------------
// init Functions
//---------------------------------
function initCookies(){
  const cookiesArray = document.cookie.split(";");
  for (let cookie of cookiesArray){
    if (cookie.trim() == "") { continue; }
    cookie = cookie.trim().split("=")
    // console.log(`cookie[${cookie[0]}][${cookie[1]}]`)
    const key = cookie[0].trim()
    const val = cookie[1].trim()
    switch (key){
      case consts.DOM_IDS.latlng_input_1:
        DOM_latlon_input_1.value = val
        break;
      case consts.DOM_IDS.latlng_input_2:
        DOM_latlon_input_2.value = val
        break;
      case consts.DOM_IDS.STARTING_POSITION_COOKIE_NAME:
        const startPosition = val.split(",")
        consts.START_DATA.coordinates = [startPosition[0], startPosition[1]]
        consts.START_DATA.zoom = startPosition[2]
        break
      case consts.DOM_IDS.select_meshlevel:
        DOM_userSelected_meshSize.value = val;
        break
      case consts.DOM_IDS.select_hyphen:
        DOM_userSelected_meshTable_hyphenSelect.value = val
        break
      default:
        if (key.startsWith(consts.DOM_IDS.meshlist_table)){
          const meshCodes = val.split(",")
          for (const code of meshCodes){
            if (code.trim() != ""){
              insertMeshCodeToTable_inner(code)
            }
          }
        } else {
          console.log(`No matching cookie case[${cookie[0]}]`);
        }
    }
  }
}

//---------------------------------
// イベント定義 Register Events and set init Consts
//---------------------------------
// HTML読み込み完了時の処理
document.addEventListener("DOMContentLoaded", ()=> {
  // テーブルに行を追加
  if (DOM_userSelected_meshTable.rows.length < consts.TABLE_MIN_ROW){
    for (let i = DOM_userSelected_meshTable.rows.length; i < consts.TABLE_MIN_ROW; i++) {
      insertRowToTable(DOM_userSelected_meshTable);
    }
  }

  DOM_userSelected_meshSize              .addEventListener("change", () => meshSizeUpdated()); // メッシュコードセレクトの選択
  DOM_userSelected_meshTable_hyphenSelect.addEventListener("change", (e)=> changeMeshHyphen(e.currentTarget.value)); // ハイフン有無の選択
  DOM_clearMarkerBtn_1.addEventListener("click", ()=> clearLatLonSearch(1));
  DOM_zoomToPointBtn_1.addEventListener("click", ()=> setLatLonSearch(1));
  DOM_clearMarkerBtn_2.addEventListener("click", ()=> clearLatLonSearch(2));
  DOM_zoomToPointBtn_2.addEventListener("click", ()=> setLatLonSearch(2));
  DOM_sortAscBtn      .addEventListener("click", ()=> sortTable("asc"));
  DOM_sortDescBtn     .addEventListener("click", ()=> sortTable("desc"));
  DOM_clearBtn        .addEventListener("click", ()=> clearTable());
  DOM_pasteBtn        .addEventListener("click", ()=> pasteMeshList());
  DOM_copyBtn         .addEventListener("click", ()=> copyMeshList());
});

const _getUserSelectedMeshSize = () => DOM_userSelected_meshSize.value;
const _isMeshCodeSelected = (meshCode) => isMeshCodeSelected(meshCode) // 選択したメッシュのテーブル行番号を取得
const _meshClicked = (meshCode) => meshClicked(meshCode)

//---------------------------------
// init Executions
//---------------------------------
initCookies()

updateSelectedMeshCounter(); // 選択したメッシュ数を表示
mapGenerator.initMapGenerator(
  _getUserSelectedMeshSize, //getMeshSize
  _isMeshCodeSelected, //check if mesh selected
  _meshClicked, //actions to perform when a mesh is clicked
  _updateMapPositionCookie //updates map position cookies
)

