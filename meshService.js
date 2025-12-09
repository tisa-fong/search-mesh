import { initMapGenerator, updateMapMeshes, zoomToMesh, convertMeshCode_to_meshArray, removeLatLonMarker, zoomToLatLonMarker } from "./meshGenerator.js";

//////////////////////////////////
// Constants
//////////////////////////////////
const map_dom_id = "map_area"
const starting_coordinates = [35.658577, 139.745451]
const starting_zoom = 7
const latLonSearchZoom = 14

const DOM_userSelected_meshSize = document.getElementById("select_meshlevel");
const DOM_latlon_input = document.getElementById("latlng_input_1");
const DOM_clearMarkerBtn = document.getElementById("clearMarkerBtn_1");
const DOM_zoomToPointBtn = document.getElementById("zoomToPointBtn_1");
const DOM_userSelected_meshTable = document.getElementById("list_table");
const DOM_meshTable_selectedMeshCounter = document.getElementById("selected_mesh_count");
const DOM_userSelected_meshTable_hyphenCheckbox = document.getElementById("select_hyphen");
const DOM_sortAscBtn = document.getElementById("sortAscBtn");
const DOM_sortDescBtn = document.getElementById("sortDescBtn");
const DOM_clearBtn = document.getElementById("clearBtn");
const DOM_pasteBtn = document.getElementById("pasteBtn");
const DOM_copyBtn = document.getElementById("copyBtn");

const mesh_selected_fillColor = "#ff0000"
const mesh_partlySelected_fillColor = "#ff7700"
const mesh_default_fillColor = "#ffffff"
const mesh_gridline_color = "#ff0000"
const table_mouseOver_color = "#c0c0c0"
const table_mouseLeave_color = ""

const TABLE_MIN_ROW = 5; // min rows for the meshCodeTable
const MESH_MINMAX_LIST = [ // meshlist paste boundaries
  [35, 69], //1次メッシュのLat Vertical
  [22, 46], //1次メッシュのLon Horizontal
  [0, 7],   //2次メッシュのVertical
  [0, 7],   //2次メッシュのHorizontal
  [0, 9],   //3次メッシュのVertical
  [0, 9]    //3次メッシュのHorizontal
]
const MESHDATA_FROM_LENGTH = {
  4:{
    "level:": 1,
  },
  6:{
    "maxParts": 64,
    "level:": 2,
    "partsLength": 8,
  },
  8:{
    "maxParts": 100,
    "level:": 3,
    "partsLength": 10,
  }
}

// For a semi-permanant cookie (10 years)
const tenYears = 10 * 365 * 24 * 60 * 60; // seconds

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
    if (
      !(tmpMeshInt >= MESH_MINMAX_LIST[i][0] &&
        tmpMeshInt <= MESH_MINMAX_LIST[i][1])
    ) {
      return false;
    }
  }
  return true;
}

//---------------------------------
// 緯度経度検索関数 LatLon Search Functions
//---------------------------------
// 検索削除
function clearLatLonSearch() {
  // マーカーがある場合、削除
  removeLatLonMarker();
  DOM_latlon_input.value = "";
}

function latLonSearch() {
  // 入力値を取得
  const zoomInputString = DOM_latlon_input.value.trim();
  if (zoomInputString === "") {
    // 空欄で検索した場合、マーカーがあれば削除
    removeLatLonMarker();
  }
  const zoomInputArray = zoomInputString.split(",");
  const searchLatlngArray = [
    parseFloat(zoomInputArray[0]),
    parseFloat(zoomInputArray[1]),
  ];

  zoomToLatLonMarker(searchLatlngArray, latLonSearchZoom)
}


//---------------------------------
// テーブル操作関数 mesh Table Button Functions
//---------------------------------
// テーブルのハイフン有無を切り替え
function changeMeshHyphen(hyphen_selection) {
  // テーブル取得
  // 末尾まで行を順に処理
  for (let i = 0; (row = DOM_userSelected_meshTable.rows[i]); i++) {
    // 元のテキストを取得
    let original_text = row.cells[0].innerText;
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
  for (let i = 0; i < TABLE_MIN_ROW; i++) {
    insertRowToTable(DOM_userSelected_meshTable);
  }
  updateMapMeshes()
  updateSelectedMeshCounter();
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
      let meshErrorArray = [];
      for (let currMeshCode of splitRows){
        if (currMeshCode == "") { continue; } // skip if empty

        // ハイフンを除去
        currMeshCode = currMeshCode.replace(/-/g, "");
        
        // メッシュコードに該当するもののみ追加
        if (isNumeric(currMeshCode) && 
           (currMeshCode.length === 4 || currMeshCode.length === 6 || currMeshCode.length === 8)
        ) {
          // メッシュコード配列を取得
          let currMeshArray = convertMeshCode_to_meshArray(currMeshCode);
          // メッシュコードが正しい場合のみテーブルに追加
          if (checkMeshCode(currMeshArray)) {
            // メッシュコードがすでにテーブルに存在するか確認
            if (isMeshCodeSelected(currMeshCode) === false) {
              // 存在しない場合のみ追加
              insertMeshCodeToTable(currMeshCode);
              // 貼り付けた値の先頭の場合、値を保持 - the first item in the list is zoomed to at the end
              if (pasteFirstMeshCode === null) {
                pasteFirstMeshCode = currMeshCode;
              }
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
        zoomToMesh(pasteFirstMeshCode);
      }
      if (meshErrorArray.length > 0) {
        alert("貼り付けメッシュコード不正: " + meshErrorArray);
      }
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
    const meshTableRow = DOM_userSelected_meshTable.rows[i].cells[0].innerText.replace(/-/g, "");
    // 該当するメッシュの場合、行番号を返却
    if (meshTableRow.trim() != ""){
      // if (
      //     (meshCode.startsWith(meshTableRow)) || 
      //     
      // ) { 
      //   return true;
      // }
      if (
        (meshTableRow == meshCode) ||
        (meshCode.startsWith(meshTableRow)) // 5733.startsWith(573336) F, 573336.startsWith(5733) T
      ){ return 1; }
      else if (
        (meshTableRow.startsWith(meshCode)) // 573336.startsWith(5733) T, 5733.startsWith(573336) F
      ){ return 2; }
    }
  }
  return 0;
}

const meshClicked = (meshCode) => {
  // check if the mesh is selected
  const isSelected = isMeshCodeSelected(meshCode)

  // if not selected insert it into the table
  if (!isSelected) { 
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
  const meshSizeDict = MESHDATA_FROM_LENGTH[meshCode.length]

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
}
function insertMeshCodeToTable_inner(text){
  const meshCode = text
  const inputCellIndex = getTableEmptyRowOrAddNewRow();

  // セルを追加 - get the cell in the row
  const tgtCell = DOM_userSelected_meshTable.rows[inputCellIndex].cells[0];
  // ハイフン有無の選択状態を取得 - add hyphens if needed
  if (DOM_userSelected_meshTable_hyphenCheckbox.value.includes("-")) {
    // -ありの場合、メッシュコードにハイフンを付与
    meshCode = addHyphen(meshCode);
  }
  // メッシュコードを記入 -update the cell with the meshCode
  tgtCell.innerText = meshCode;

  // マウスオンを設定
  tgtCell.addEventListener("mouseover", function (e) {
    e.target.style.background = table_mouseOver_color;
  });
  tgtCell.addEventListener("mouseleave", function (e) {
    e.target.style.background = table_mouseLeave_color;
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
  // クリックイベントを付与
  insertRow.addEventListener("click", function (e) {
    // メッシュにズーム
    const tgtMeshCode = e.currentTarget.innerText.replace(/-/g, "");
    if ((tgtMeshCode == null) || (tgtMeshCode == "")) { return; }
    zoomToMesh(tgtMeshCode);
  });
  return meshTable;
}



function removeMeshCodeFromTable(meshCode){
  const meshSizeDict = MESHDATA_FROM_LENGTH[meshCode.length]
  //check if its parent meshCode
  if (meshSizeDict.size == 1){
    removeMeshCodeFromTable_inner(meshCode)
  }
  else {
    //cacade to top level if needed, skipping self size
    for (const meshSizeLength in MESHDATA_FROM_LENGTH){
      if (meshCode.length == meshSizeLength) { break }

      const upperLevelMeshCode = meshCode.substring(0, meshSizeLength);
      const currLevelMeshCode = meshCode.substring(0, (Number(meshSizeLength)+2));
      let upperLevelCodeFound = false
      for (const row of DOM_userSelected_meshTable.rows){
        if (row.cells[0].innerText == upperLevelMeshCode){
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
}
function removeMeshCodeFromTable_unGroupUpperLevel(upperLevelMeshCode, currLevelMeshCode){
  //remove upper mesh size selection
  removeMeshCodeFromTable(upperLevelMeshCode)
  // add all parts except the target meshCode to be removed
  // console.log(`${meshSizesFromLength[currLevelMeshCode.length].partsLength}, ${currLevelMeshCode.length} ][ ${upperLevelMeshCode}, ${currLevelMeshCode}`)
  for (let x = 0; x < MESHDATA_FROM_LENGTH[currLevelMeshCode.length].partsLength; x++){
    for (let y = 0; y < MESHDATA_FROM_LENGTH[currLevelMeshCode.length].partsLength; y++){
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
  if (currRowNum < TABLE_MIN_ROW) {
    insertRowToTable(DOM_userSelected_meshTable)
  }
  // 選択したメッシュ数を表示
  updateSelectedMeshCounter();
}


//////////////////////////////////
// initialization
//////////////////////////////////
//---------------------------------
// イベント定義 Register Events
//---------------------------------
// HTML読み込み完了時の処理
document.addEventListener("DOMContentLoaded", ()=> {
  // テーブルに行を追加
  for (let i = 0; i < TABLE_MIN_ROW; i++) {
    insertRowToTable(DOM_userSelected_meshTable);
  }

  DOM_userSelected_meshTable_hyphenCheckbox.addEventListener("change", (e)=> changeMeshHyphen(e.currentTarget.value)); // ハイフン有無の選択
  DOM_userSelected_meshSize                .addEventListener("change", () => updateMapMeshes()); // メッシュコードセレクトの選択
  DOM_clearMarkerBtn.addEventListener("click", ()=> clearLatLonSearch());
  DOM_zoomToPointBtn.addEventListener("click", ()=> latLonSearch());
  DOM_sortAscBtn    .addEventListener("click", ()=> sortTable("asc"));
  DOM_sortDescBtn   .addEventListener("click", ()=> sortTable("desc"));
  DOM_clearBtn      .addEventListener("click", ()=> clearTable());
  DOM_pasteBtn      .addEventListener("click", ()=> pasteMeshList());
  DOM_copyBtn       .addEventListener("click", ()=> copyMeshList());
});

//---------------------------------
// init Functions
//---------------------------------
const _getUserSelectedMeshSize = () => DOM_userSelected_meshSize.value;
const _isMeshCodeSelected = (meshCode) => isMeshCodeSelected(meshCode) // 選択したメッシュのテーブル行番号を取得
const _meshClicked = (meshCode) => meshClicked(meshCode)

//---------------------------------
// init Executions
//---------------------------------
updateSelectedMeshCounter(); // 選択したメッシュ数を表示
initMapGenerator(
  map_dom_id,
  starting_coordinates,
  starting_zoom,

  mesh_selected_fillColor,
  mesh_partlySelected_fillColor,
  mesh_default_fillColor,
  mesh_gridline_color,

  _getUserSelectedMeshSize, //getMeshSize
  _isMeshCodeSelected, //check if mesh selected
  _meshClicked //actions to perform when a mesh is clicked
)

