import json
import re

# Read markers from mapData.ts
with open('src/data/mapData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract IDs and Coords
markers = []
# Match tollGates
tg_matches = re.findall(r"id: \"([^\"]+)\",\s+name: \"[^\"]+\",\s+lat: ([\d.]+),\s+lng: ([\d.]+)", content)
for m in tg_matches:
    markers.append({'id': m[0], 'lat': float(m[1]), 'lng': float(m[2])})
# Match passagePoints
pp_matches = re.findall(r"id: \"([^\"]+)\",\s+name: \"[^\"]+\",\s+subtitle: \"[^\"]+\",\s+lat: ([\d.]+),\s+lng: ([\d.]+)", content)
for m in pp_matches:
    markers.append({'id': m[0], 'lat': float(m[1]), 'lng': float(m[2])})

# Read backbone (hard to parse TS, so I'll just mock the full list)
# Actually, I'll use the file directly
with open('src/data/highwayBackbone.ts', 'r', encoding='utf-8') as f:
    bb_content = f.read()
    # Extract ALL [lat, lng]
    bb_coords = re.findall(r"\[([\d.]+),\s*([\d.]+)\]", bb_content)
    backbone = [[float(c[0]), float(c[1])] for c in bb_coords]

def get_snap_idx(lat, lng):
    min_idx = 0
    min_d = float('inf')
    for i, (blat, blng) in enumerate(backbone):
        d = (blat - lat)**2 + (blng - lng)**2
        if d < min_d:
            min_d = d
            min_idx = i
    return min_idx

sorted_markers = []
for m in markers:
    sorted_markers.append({'id': m['id'], 'idx': get_snap_idx(m['lat'], m['lng'])})

sorted_markers.sort(key=lambda x: x['idx'])

print(json.dumps(sorted_markers, indent=2))
