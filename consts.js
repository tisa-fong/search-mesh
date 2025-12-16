//////////////////////////////////
// Constants
//////////////////////////////////
export const MAP_DOM_ID = "map_area"
export const LATLON_SEARCHZOOM = 14
export const TABLE_MIN_ROW = 5; // min rows for the meshCodeTable

export const START_DATA = {
    coordinates: [35.658577, 139.745451],
    zoom: 7,
}

export const DOM_IDS = {
    STARTING_POSITION_COOKIE_NAME: "startingPosition",
    select_meshlevel: "select_meshlevel",
    latlng_input_1: "latlng_input_1",
    clearMarkerBtn_1: "clearMarkerBtn_1",
    zoomToPointBtn_1: "zoomToPointBtn_1",
    latlng_input_2: "latlng_input_2",
    clearMarkerBtn_2: "clearMarkerBtn_2",
    zoomToPointBtn_2: "zoomToPointBtn_2",
    meshlist_table: "meshlist_table",
    selected_mesh_count: "selected_mesh_count",
    select_hyphen: "select_hyphen",
    sortAscBtn: "sortAscBtn",
    sortDescBtn: "sortDescBtn",
    clearBtn: "clearBtn",
    pasteBtn: "pasteBtn",
    copyBtn: "copyBtn",
    plusMinus1Btn: "plusMinus1Btn"
}
export const DOMs = { //set in meshService
    DOM_userSelected_meshSize: null,
    DOM_latlon_input_1: null,
    DOM_clearMarkerBtn_1: null,
    DOM_zoomToPointBtn_1: null,
    DOM_latlon_input_2: null,
    DOM_clearMarkerBtn_2: null,
    DOM_zoomToPointBtn_2 : null,
    DOM_userSelected_meshTable: null,
    DOM_meshTable_selectedMeshCounter: null,
    DOM_userSelected_meshTable_hyphenSelect: null,
    DOM_sortAscBtn: null,
    DOM_sortDescBtn: null,
    DOM_clearBtn: null,
    DOM_pasteBtn: null,
    DOM_copyBtn: null,
    DOM_plusMinus1Btn: null,
} 



export const COLORS = {
    MESH: {
        selected_fill: "#ff0000",
        partlySelected_fill: "#ff7700",
        default_fill: "#ffffff",
        gridline: "#ff0000"
    },
    TABLE: {
        mouseOver: "#c0c0c0",
        mouseLeave: ""
    }
}

export const COOKIE_SETTINGS = {
    expiry: 10 * 365 * 24 * 60 * 60, // seconds, For a semi-permanant cookie (10 years)
    meshCode_count: 4,               //each cookie has 4kb limit 4 (4 cookies mean 4*4=16kb worth of meshcodes)
    meshCode_count_perCookie: 400    //each cookie has 4kb limit (about 440 can fit in a single cookie)
}

export const MESH_DATA = {
    MESH_ARRAY_LENGTH_LIST: [2, 2, 1, 1, 1, 1],
    BOUNDARIES: { // polygon boundaries - do not generate outside of japan
        lat: {
            min: 23,  // Bottom boundary
            max: 47   // Top boundary
        },
        lon: {
            min: 122, // Left boundary
            max: 147  // Right boundary
        }
    },
    1: {
        level: 1,
        meshLength: 4,
        defaultZoom: 9, // メッシュコードからメッシュサイズを取得 //called from zoomToMesh
        zoomThresholds: [6, 0], // threshold for line sizes
        ratio: { // calculation ratios for japanese meshes
            lat: 40 / 60,
            lon: 1
        },
        boundary:{
            lat: [35, 69], //1次メッシュのLat Vertical
            lon: [22, 46]  //1次メッシュのLon Horizontal
        }
    },
    2: {
        level: 2,
        meshLength: 6,
        defaultZoom: 12,
        zoomThresholds: [9, 7],
        ratio: {
            lat: 5 / 60,
            lon: 7.5 / 60
        },
        boundary:{
            lat: [0, 7], //2次メッシュのVertical
            lon: [0, 7]  //2次メッシュのHorizontal
        },
        partsLength: 8,
        maxParts: 64,
    },
    3: {
        level: 3,
        meshLength: 8,
        defaultZoom: 14,
        zoomThresholds: [12, 10],
        ratio: {
            lat: 30 / 60 / 60,
            lon: 45 / 60 / 60
        },
        boundary:{
            lat: [0, 9], //3次メッシュのVertical
            lon: [0, 9]  //3次メッシュのHorizontal
        },
        partsLength: 10,
        maxParts: 100,
    }
};
export const MESH_DATA_FROM_LENGTH = {
  4: MESH_DATA[1],
  6: MESH_DATA[2],
  8: MESH_DATA[3]
}

export const SELECTCODE = {
  not_selected: 0,
  selected: 1,
  partially_selected: 2
}


//---------------------------------
// helper Functions
//---------------------------------
export function isNumeric(str) {
  return str !== "" && !isNaN(str);
}

// メッシュコードにハイフン付与
export function addHyphen(meshCode) {
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