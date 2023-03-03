import requests

r = requests.get("https://identityservice.staging.audius.co/health_check")
sc: int = r.status_code
json = r.json()

is_healthy: bool = json["status"] == "Healthy"

description = json["description"].lower()
if "stopped producing blocks" in description:
    is_healthy = False

if not is_healthy:
    exit(1)
