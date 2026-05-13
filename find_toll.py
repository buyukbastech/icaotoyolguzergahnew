import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

overpass_url = "http://overpass-api.de/api/interpreter"
overpass_query = """
[out:json];
node["highway"="toll_gantry"](41.080, 28.800, 41.100, 28.820);
out center;
"""

try:
    req = urllib.request.Request(overpass_url, data=overpass_query.encode('utf-8'))
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        for element in data['elements']:
            print(f"Gantry at lat, lon: {element['lat']}, {element['lon']}")
except Exception as e:
    print(f"Error: {e}")
