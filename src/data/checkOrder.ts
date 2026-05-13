import { tollGates, passagePoints, routeSerbest_S1A_to_S5A } from "./mapData";
import { backboneS5A_G1, backboneG1_Bridge_G5, backboneG5_Asia } from "./highwayBackbone";

const fullBackbone = [
  ...routeSerbest_S1A_to_S5A,
  ...backboneS5A_G1.slice(1),
  ...backboneG1_Bridge_G5.slice(1),
  ...backboneG5_Asia.slice(1),
];

function getSnapIdx(lat: number, lng: number) {
  let minIdx = 0;
  let minD = Infinity;
  for (let i = 0; i < fullBackbone.length; i++) {
    const d = (fullBackbone[i][0] - lat)**2 + (fullBackbone[i][1] - lng)**2;
    if (d < minD) { minD = d; minIdx = i; }
  }
  return minIdx;
}

const all = [...tollGates, ...passagePoints];
const sorted = all.map(p => ({ id: p.id, idx: getSnapIdx(p.lat, p.lng) }))
                 .sort((a, b) => a.idx - b.idx);

console.log(JSON.stringify(sorted, null, 2));
