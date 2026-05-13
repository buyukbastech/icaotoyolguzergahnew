import requests
import json

pts = [
    (29.20257, 41.19227),  # G5 Riva
    (29.29756, 41.11491),  # G6 Hüseyinli
    (29.33413, 41.12149),  # G11 Kömürlük
    (29.25771, 41.04586),  # G7 Reşadiye
    (29.16717, 41.05220),  # S7 Çamlık
    (29.19419, 41.03858),  # S6 Çekmeköy
    (29.19615, 41.02364),  # S8 Sarıgazi
    (29.26512, 41.03123),  # G8A Alemdağ
    (29.26886, 41.00514),  # G9 Paşaköy
    (29.31553, 40.95401),  # G10 Mecidiye
    (29.32986, 40.95752),  # G12 Kurnaköy
]

url = f"https://router.project-osrm.org/route/v1/driving/{';'.join([f'{p[0]},{p[1]}' for p in pts])}?overview=full&geometries=geojson"
resp = requests.get(url).json()

if resp['code'] == 'Ok':
    coords = resp['routes'][0]['geometry']['coordinates']
    # Format as TypeScript array
    ts_array = "export const backboneFullAsia: [number, number][] = " + json.dumps([[round(c[1], 6), round(c[0], 6)] for c in coords]) + ";"
    with open("src/data/backboneFullAsia.ts", "w") as f:
        f.write(ts_array)
    print("Success")
else:
    print("Error:", resp['code'])
