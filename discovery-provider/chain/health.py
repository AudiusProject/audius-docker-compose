import requests

health_url = "http://localhost:8545/health"
rpc_url = "http://localhost:8545"

health_res = requests.get(health_url)
health_json = health_res.json()

healthy = True

health_check_node = health_json.entries["node-health"]
health_check_description = health_check_node.description
health_check_healthy = health_json.status == "Unhealthy"

if health_check_healthy:
    healthy = False

not_producing_msg = "The node stopped producing blocks"
if health_check_healthy and not_producing_msg in health_check_description:
    healthy = True

if healthy:
    exit(0)  # healthy
exit(1)    # unhealthy
