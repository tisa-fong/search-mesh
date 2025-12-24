import * as consts from "./consts.js"
import * as cookieManager from "./cookieManager.js"
import * as latLonSearch from "./latLonSearch.js"
import * as mapGenerator from "./meshGenerator.js"
import * as meshListTable from "./meshListTable.js"

//////////////////////////////////
// Functions
//////////////////////////////////
function meshSizeUpdated(){
  // consts.DOMs.DOM_userSelected_meshSize.value
  mapGenerator.updateMap()
  cookieManager.setCookie(consts.DOM_IDS.select_meshlevel, consts.DOMs.DOM_userSelected_meshSize.value)
}
function checkGridLines(enableGridLines){
  mapGenerator.setGridLines(enableGridLines)
  cookieManager.setCookie(consts.DOM_IDS.check_gridLines, String(enableGridLines))
}

function test() {
}
function test2(){
}

//////////////////////////////////
// initialization
//////////////////////////////////
//---------------------------------
// init Constants
//---------------------------------
consts.DOMs.DOM_userSelected_meshSize = document.getElementById(consts.DOM_IDS.select_meshlevel);
consts.DOMs.DOM_check_gridLines = document.getElementById(consts.DOM_IDS.check_gridLines);
consts.DOMs.DOM_latlon_input_1 = document.getElementById(consts.DOM_IDS.latlng_input_1);
consts.DOMs.DOM_clearMarkerBtn_1 = document.getElementById(consts.DOM_IDS.clearMarkerBtn_1);
consts.DOMs.DOM_zoomToPointBtn_1 = document.getElementById(consts.DOM_IDS.zoomToPointBtn_1);
consts.DOMs.DOM_latlon_input_2 = document.getElementById(consts.DOM_IDS.latlng_input_2);
consts.DOMs.DOM_clearMarkerBtn_2 = document.getElementById(consts.DOM_IDS.clearMarkerBtn_2);
consts.DOMs.DOM_zoomToPointBtn_2 = document.getElementById(consts.DOM_IDS.zoomToPointBtn_2);
consts.DOMs.DOM_userSelected_meshTable = document.getElementById(consts.DOM_IDS.meshlist_table);
consts.DOMs.DOM_meshTable_selectedMeshCounter = document.getElementById(consts.DOM_IDS.selected_mesh_count);
consts.DOMs.DOM_userSelected_meshTable_hyphenSelect = document.getElementById(consts.DOM_IDS.select_hyphen);
consts.DOMs.DOM_sortAscBtn = document.getElementById(consts.DOM_IDS.sortAscBtn);
consts.DOMs.DOM_sortDescBtn = document.getElementById(consts.DOM_IDS.sortDescBtn);
consts.DOMs.DOM_clearBtn = document.getElementById(consts.DOM_IDS.clearBtn);
consts.DOMs.DOM_pasteBtn = document.getElementById(consts.DOM_IDS.pasteBtn);
consts.DOMs.DOM_copyBtn = document.getElementById(consts.DOM_IDS.copyBtn);
consts.DOMs.DOM_plusMinus1Btn = document.getElementById(consts.DOM_IDS.plusMinus1Btn);

//---------------------------------
// イベント定義 Register Events and set init Consts
//---------------------------------
// HTML読み込み完了時の処理
document.addEventListener("DOMContentLoaded", ()=> {
  // テーブルに行を追加
  if (consts.DOMs.DOM_userSelected_meshTable.rows.length < consts.TABLE_MIN_ROW){
    for (let i = consts.DOMs.DOM_userSelected_meshTable.rows.length; i < consts.TABLE_MIN_ROW; i++) {
      meshListTable.insertRowToTable(consts.DOMs.DOM_userSelected_meshTable);
    }
  }

  consts.DOMs.DOM_userSelected_meshSize              .addEventListener("change", () => meshSizeUpdated()); // メッシュコードセレクトの選択
  consts.DOMs.DOM_userSelected_meshTable_hyphenSelect.addEventListener("change", (e)=> meshListTable.changeMeshHyphen(e.currentTarget.value)); // ハイフン有無の選択
  consts.DOMs.DOM_check_gridLines                    .addEventListener("change", (e)=> checkGridLines(e.target.checked));
  consts.DOMs.DOM_clearMarkerBtn_1.addEventListener("click", ()=> latLonSearch.clearLatLonSearch(1));
  consts.DOMs.DOM_zoomToPointBtn_1.addEventListener("click", ()=> latLonSearch.setLatLonSearch(1));
  consts.DOMs.DOM_clearMarkerBtn_2.addEventListener("click", ()=> latLonSearch.clearLatLonSearch(2));
  consts.DOMs.DOM_zoomToPointBtn_2.addEventListener("click", ()=> latLonSearch.setLatLonSearch(2));
  consts.DOMs.DOM_sortAscBtn      .addEventListener("click", ()=> meshListTable.sortTable("asc"));
  consts.DOMs.DOM_sortDescBtn     .addEventListener("click", ()=> meshListTable.sortTable("desc"));
  consts.DOMs.DOM_clearBtn        .addEventListener("click", ()=> meshListTable.clearTable());
  consts.DOMs.DOM_pasteBtn        .addEventListener("click", ()=> meshListTable.pasteMeshList());
  consts.DOMs.DOM_copyBtn         .addEventListener("click", ()=> meshListTable.copyMeshList());
  consts.DOMs.DOM_plusMinus1Btn   .addEventListener("click", ()=> meshListTable.all_plusMinus1());
});

const _isMeshCodeSelected = (meshCode) => meshListTable.isMeshCodeSelected(meshCode) // 選択したメッシュのテーブル行番号を取得
const _meshClicked = (meshCode) => meshListTable.meshClicked(meshCode)

//---------------------------------
// init Executions
//---------------------------------
cookieManager.initCookies()

meshListTable.updateSelectedMeshCounter(); // 選択したメッシュ数を表示

mapGenerator.initMapGenerator(
  _isMeshCodeSelected, //check if mesh selected
  _meshClicked, //actions to perform when a mesh is clicked
  cookieManager.updateMapPositionCookie //updates map position cookies
)

