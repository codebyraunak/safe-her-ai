import requests

overpass_url = "http://overpass-api.de/api/interpreter"
overpass_query = """
[out:json];
(
  node["amenity"="police"](around:2000,12.9716,77.5946);
);
out body;
"""
headers = {
    "User-Agent": "SafeHerAI/1.0"
}
response = requests.post(overpass_url, data={"data": overpass_query}, headers=headers)
print(response.status_code)
print(response.text[:200])
