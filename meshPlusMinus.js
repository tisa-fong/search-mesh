import * as consts from "./consts.js"

export function getSurroundingMeshes_set(meshCode){
    let meshSet = new Set();
    if (meshCode.length === 4){
        meshSet = consts.set_union(meshSet, getSurroundingMeshes_1st(meshCode));
    } else if (meshCode.length === 6){
        meshSet = consts.set_union(meshSet, getSurroundingMeshes_2nd(meshCode));
    } else if (meshCode.length === 8){
        meshSet = consts.set_union(meshSet, getSurroundingMeshes_3rd(meshCode));
    }
    else { throw new Error(`getSurroundingMeshes: Unsupported meshCode: ${meshCode}`);  }

    // console.log(`final call: ${meshSet.size}`)
    return meshSet;
}


function expandMeshCode(meshCode, baseInclude0){
    const meshSet = new Set();
    for (let i = 0; i <= baseInclude0; i++){    
        for (let n = 0; n <= baseInclude0; n++) {
            meshSet.add(`${meshCode}${n}${i}`)
            meshSet.add(`${meshCode}${i}${n}`)
        }
    }
    return meshSet
}
function getSurroundingMeshes_1st(meshCode){
    // ex. 1234 need 
    // [
    //      0-7,0
    //      0, 0-7
    //      0-7,9
    //      9, 0-7
    // ]
    const base = 8
    const meshSet = getSurroundingMeshes_inner(meshCode, base, (mesh) => getSurroundingMeshes_2nd(mesh))

    // let x6 = 0
    // let x8 = 0
    // for (const m of meshSet){ 
    //     if (m.length == 6) { x6++}
    //     if (m.length == 8) { x8++}
    // }
    // console.log(`6s> ${x6}: 8s> ${x8}`)
    // console.log(meshSet.size) // should be all 405
    // minimize into mesh 1
    for (const m of meshSet) {
        if (m.startsWith(meshCode)) {
            meshSet.delete(m);
        }
    }
    meshSet.add(meshCode)
    // let x4 = 0
    // let x8 = 0
    // for (const m of meshSet){ 
    //     if (m.length == 4) { x4++}
    //     if (m.length == 8) { x8++}
    // }
    // console.log(`4s> ${x4}: 8s> ${x8}`)
    // console.log(`getSurroundingMeshes_1st: ${meshCode} : ${meshSet.size}`)
    return meshSet 
}
function getSurroundingMeshes_2nd(meshCode){
    // ex. 1234-45 need 
    // [
    //      0-9,0
    //      0, 0-9
    //      0-9,9
    //      9, 0-9
    // ]
    const base = 10
    const meshSet = getSurroundingMeshes_inner(meshCode, base, (mesh) => getSurroundingMeshes_3rd(mesh))
    // console.log(meshSet.size) // should be all 144
    // minimize into mesh 2
    for (const m of meshSet) {
        if (m.startsWith(meshCode)) {
            meshSet.delete(m);
        }
    }
    meshSet.add(meshCode)
    // console.log(`getSurroundingMeshes_2nd: ${meshCode} : ${meshSet.size}`) // should be 45
    return meshSet    
}
function getSurroundingMeshes_inner(meshCode, base, nextFunction){
    const baseInclude0 = base - 1 //actually 10 (includes 0)

    // fully expand into the next meshLevel (1 > 64, 2 > 100)
    let meshSet = expandMeshCode(meshCode, baseInclude0)

    // only work the perimeter meshes and do not duplicate work
    const worked = new Set();
    const loop = [ 0, baseInclude0 ]
    for (const l of loop){
        for (let i = 0; i <= baseInclude0; i++) {
            const m1 = `${meshCode}${l}${i}`
            if (!worked.has(m1)){
                const meshSetB = nextFunction(m1)
                meshSet = consts.set_union(meshSet, meshSetB)
                worked.add(m1)
            }
            const m2 = `${meshCode}${i}${l}`
            if (!worked.has(m2)){
                const meshSetB = nextFunction(m2)
                meshSet = consts.set_union(meshSet, meshSetB)
                worked.add(m2)
            }
        }
    }
    // console.log(`getSurroundingMeshes_inner: ${meshCode} : ${meshSet.size}`)
    return meshSet    
}

function pad(n, width=2) { return String(n).padStart(width, '0'); }
function getSurroundingMeshes_3rd(meshCode){
    const meshSet = new Set();
    meshSet.add(meshCode)
    const meshDic = meshCode_to_mesh(meshCode)
    
    const directions = [
        [ 1,  1], [ 1,  0], [ 1, -1],
        [ 0,  1],           [ 0, -1],
        [-1,  1], [-1,  0], [-1, -1],
    ];

    for (const dir of directions){
        const deepCopy = structuredClone(meshDic);
        const tmp = meshDicAdd(deepCopy, dir[0], dir[1])
        const code =
            pad(tmp.lat[0], 2) + pad(tmp.lon[0], 2) +
            String(tmp.lat[1]) + String(tmp.lon[1]) +
            String(tmp.lat[2]) + String(tmp.lon[2]);
        meshSet.add(code)
    }
    return meshSet;
}

function meshDicAdd(meshDic, latAmt, lonAmt){
    if (latAmt === 0){}
    else { meshDic.lat = meshArrayAdd(meshDic.lat, latAmt) }
    if (lonAmt === 0){}
    else { meshDic.lon = meshArrayAdd(meshDic.lon, lonAmt) }
    return meshDic
}
function meshArrayAdd(meshArray, amt){
    const meshSize = meshArray.length
    switch (meshSize){
        case 1:
            return meshArray1Add(meshArray, amt)
        case 2:
            return meshArray2Add(meshArray, amt)
        case 3:
            return meshArray3Add(meshArray, amt)
        default:
            throw new Error(`Unsupported mesh array length: ${meshSize}`);
    }
}
function meshArray1Add(meshArray, amt){
    meshArray[0] = Number(meshArray[0]) + amt;
    meshArray[0] = String(meshArray[0]);
    return meshArray
}
function meshArray2Add(meshArray, amt){
    meshArray[1] = Number(meshArray[1]) + amt;
    while (meshArray[1] > 7){
        meshArray = meshArray1Add(meshArray, 1)
        meshArray[1] = meshArray[1] - 8;
    }
    while (meshArray[1] < 0){
        meshArray = meshArray1Add(meshArray, -1)
        meshArray[1] = meshArray[1] + 8;
    }
    meshArray[1] = String(meshArray[1]);
    return meshArray
}
function meshArray3Add(meshArray, amt){
    meshArray[2] = Number(meshArray[2]) + amt;
    while (meshArray[2] > 9){
        meshArray = meshArray2Add(meshArray, 1)
        meshArray[2] = meshArray[2] - 10;
    }
    while (meshArray[2] < 0){
        meshArray = meshArray2Add(meshArray, -1)
        meshArray[2] = meshArray[2] + 10;
    }
    meshArray[2] = String(meshArray[2]);
    return meshArray
}


function meshCode_to_mesh(meshCode) {
  const meshDic = { lat: [], lon:[] };

  let tmpMeshCode = meshCode.replace(/-/g, "");
  let loopCounter = 0;
  // メッシュコードを配列に変換
  while (tmpMeshCode.length > 0) {
    const tmpMeshSplit = tmpMeshCode.slice(0, consts.MESH_DATA.MESH_ARRAY_LENGTH_LIST[loopCounter]);
    if (loopCounter % 2 == 0){
        meshDic.lat.push(tmpMeshSplit);
    } else {
        meshDic.lon.push(tmpMeshSplit);
    }
    tmpMeshCode = tmpMeshCode.replace(tmpMeshSplit, "");
    loopCounter += 1;
  }
  return meshDic;
}