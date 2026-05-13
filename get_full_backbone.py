# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def get_route(waypoints):
    coords_str = ";".join([f"{lng},{lat}" for lng, lat in waypoints])
    url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("code") == "Ok":
        return data["routes"][0]["geometry"]["coordinates"]
    return []

# Segment 1: S5A → G1 Fenertepe Gise
seg1 = get_route([
    (28.80782, 41.12746),
    (28.82100, 41.19710),
])
print(f"Seg1 (S5A->G1): {len(seg1)} points")

# Segment 2: G1 → Kopru → G5 Riva
seg2 = get_route([
    (28.82100, 41.19710),
    (29.11140, 41.20240),
    (29.20000, 41.19200),
])
print(f"Seg2 (G1->Bridge->G5): {len(seg2)} points")

# Segment 3: G5 → S6A → S7A → S8A (Asya)
seg3 = get_route([
    (29.20000, 41.19200),
    (29.19420, 41.03859),
    (29.16718, 41.05221),
    (29.19616, 41.02364),
])
print(f"Seg3 (G5->S6A->S7A->S8A): {len(seg3)} points")

# Write combined backbone to TS file
def fmt(coords):
    lines = []
    for i, (lng, lat) in enumerate(coords):
        comma = "," if i < len(coords) - 1 else ""
        lines.append(f"  [{lat:.6f}, {lng:.6f}]{comma}")
    return "\n".join(lines)

output = f"""// O-6 Kuzey Marmara Otoyolu - Tam Omurga (OSRM'den)
// Segment 1: S5A → G1 Fenertepe Gise ({len(seg1)} nokta)
export const backboneS5A_G1: [number, number][] = [
{fmt(seg1)}
];

// Segment 2: G1 → Kopru → G5 Riva ({len(seg2)} nokta)
export const backboneG1_Bridge_G5: [number, number][] = [
{fmt(seg2)}
];

// Segment 3: G5 → S6A → S7A → S8A Asya taraf ({len(seg3)} nokta)
export const backboneG5_Asia: [number, number][] = [
{fmt(seg3)}
];
"""

with open("backbone_data.ts", "w", encoding="utf-8") as f:
    f.write(output)

print("\nDone! backbone_data.ts dosyasina yazildi.")
print(f"Toplam: {len(seg1)+len(seg2)+len(seg3)} nokta")
