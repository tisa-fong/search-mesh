import * as consts from "./consts.js"
import * as meshListTable from "./meshListTable.js"

//---------------------------------
// cookie Functions
//---------------------------------
export function initCookies(){
  const cookiesArray = document.cookie.split(";");
  for (let cookie of cookiesArray){
    if (cookie.trim() == "") { continue; }
    cookie = cookie.trim().split("=")
    // console.log(`cookie[${cookie[0]}][${cookie[1]}]`)
    const key = cookie[0].trim()
    const val = cookie[1].trim()
    switch (key){
      case consts.DOM_IDS.latlng_input_1:
        consts.DOMs.DOM_latlon_input_1.value = val
        break;
      case consts.DOM_IDS.latlng_input_2:
        consts.DOMs.DOM_latlon_input_2.value = val
        break;
      case consts.DOM_IDS.STARTING_POSITION_COOKIE_NAME:
        const startPosition = val.split(",")
        consts.START_DATA.coordinates = [startPosition[0], startPosition[1]]
        consts.START_DATA.zoom = startPosition[2]
        break
      case consts.DOM_IDS.select_meshlevel:
        consts.DOMs.DOM_userSelected_meshSize.value = val;
        break
      case consts.DOM_IDS.select_hyphen:
        consts.DOMs.DOM_userSelected_meshTable_hyphenSelect.value = val
        meshListTable.changeMeshHyphen(val)
        break
      default:
        if (key.startsWith(consts.DOM_IDS.meshlist_table)){
          const meshCodes = val.split(",")
          for (const code of meshCodes){
            if (code.trim() != ""){
              // if (consts.DOMs.DOM_userSelected_meshTable_hyphenSelect.value.includes("-")){
              //   consts.addHyphen(code)
              // }
              meshListTable.insertMeshCodeToTable_inner(code)
            }
          }
        } else {
          console.log(`No matching cookie case[${cookie[0]}]`);
        }
    }
  }
}


export function setCookie(key, val){
  document.cookie = `${key}=${val}; Max-Age=${consts.COOKIE_SETTINGS.expiry}; path=/`
}
export function updateMapPositionCookie(lat, lon, zoom){
  setCookie(consts.DOM_IDS.STARTING_POSITION_COOKIE_NAME, `${lat},${lon},${zoom}`)
}
export function saveMeshList(){
  let cookieCount = 0;
  let meshCount = 0;
  let meshList = "";

  const rows = consts.DOMs.DOM_userSelected_meshTable.rows;
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