import * as consts from "./consts.js"
import * as cookieManager from "./cookieManager.js"
import * as mapGenerator from "./meshGenerator.js"

//---------------------------------
// 緯度経度検索関数 LatLon Search Functions
//---------------------------------
function getTargetLatlonDOM(latlonNum){
    let targetLatlonDom = null
    switch (latlonNum) {
        case 1:
            targetLatlonDom = consts.DOMs.DOM_latlon_input_1
            break;
        case 2:
            targetLatlonDom = consts.DOMs.DOM_latlon_input_2
            break;
    }
    return targetLatlonDom
}
function updateLatLonCookie(latlonNum, targetLatlonDom){
    switch (latlonNum) {
        case 1:
            cookieManager.setCookie(consts.DOM_IDS.latlng_input_1, targetLatlonDom.value)
            break;
        case 2:
            cookieManager.setCookie(consts.DOM_IDS.latlng_input_2, targetLatlonDom.value)
            break;
    }
}
// 検索削除
export function clearLatLonSearch(latlonNum) {
    const tgtLatlonDom = getTargetLatlonDOM(latlonNum)
    mapGenerator.removeLatLonMarker(latlonNum); // マーカーがある場合、削除

    // Clear the text box
    tgtLatlonDom.value = "";
    updateLatLonCookie(latlonNum, tgtLatlonDom)

    mapGenerator.updateMap()
}

export function setLatLonSearch(latlonNum) {
    const tgtLatlonDom = getTargetLatlonDOM(latlonNum)

    // 入力値を取得
    const tgtLatLonString = tgtLatlonDom.value.trim();
    const tgtLatLonArray = tgtLatLonString.split(",");
    if (
        (tgtLatLonArray.length != 2) ||
        (!consts.isNumeric(tgtLatLonArray[0])) || (!consts.isNumeric(tgtLatLonArray[1]))
    ) {
        alert("不正の緯度経度: " + tgtLatLonString);
        return;
    }

    const searchLatlngArray = [
        parseFloat(tgtLatLonArray[0]),
        parseFloat(tgtLatLonArray[1]),
    ];

    mapGenerator.setLatLonMarker(latlonNum, searchLatlngArray, consts.LATLON_SEARCHZOOM)
    updateLatLonCookie(latlonNum, tgtLatlonDom)

    mapGenerator.updateMap()
}