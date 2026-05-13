import urllib.request
import json

# S1A'dan S5A'ya OSRM ile gercek otoyol geometrisi al
# Koordinatlar: lng,lat formatında (OSRM için)

waypoints = [
    (28.81550, 41.07074),  # S1A İSTOÇ
    (28.81386, 41.07916),  # S2A İkitelli
    (28.81367, 41.08688),  # S3A Başakşehir Güney
    (28.81498, 41.10728),  # S4A Başakşehir Kuzey
    (28.80782, 41.12746),  # S5A Fenertepe
]

coords_str = ";".join([f"{lng},{lat}" for lng, lat in waypoints])
url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson&steps=false"

print(f"Fetching: {url[:100]}...")

try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    if data.get("code") == "Ok":
        coords = data["routes"][0]["geometry"]["coordinates"]
        print(f"\nFound {len(coords)} coordinate points\n")
        print("// Paste this into mapData.ts as routeSerbest_S1A_to_S5A:")
        print("export const routeSerbest_S1A_to_S5A: [number, number][] = [")
        for i, (lng, lat) in enumerate(coords):
            comma = "," if i < len(coords) - 1 else ""
            print(f"  [{lat:.6f}, {lng:.6f}]{comma}")
        print("];")
    else:
        print("OSRM error:", data.get("code"), data.get("message"))

except Exception as e:
    print(f"Error: {e}")
