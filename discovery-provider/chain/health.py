import requests

health_url = "http://localhost:8545/health"
rpc_url = "http://localhost:8545"

health_res = requests.get(health_url)
health_json = health_res.json()

health_check_node = health_json.entries["node-health"]
description = health_check_node.description
health_check_unhealthy = health_json.status == "Unhealthy"

not_producing_msg = "The node stopped producing blocks"
stopped_producing = not_producing_msg in description

snap_rpc = {'method': 'clique_getSnapshot', 'params': [], 'id': 1, 'jsonrpc': '2.0'}
clique_snapshot_res = requests.post(rpc_url, data=snap_rpc).json().result

self_rpc = {"method": "net_localAddress", "params": [], "id": 1, "jsonrpc": "2.0"}
local_address_res = requests.post(rpc_url, data=self_rpc).json().result

is_current_signer = local_address_res in clique_snapshot_res.signers

# node is reporting healthy
if not health_check_unhealthy:
    exit(0)

# node should be able to sign but stopped producing, restart
if is_current_signer and health_check_unhealthy and stopped_producing:
    exit(0)  # prompt restart

# node is not a signer but is reporting unhealthy because it cant produce
# this is technically healthy but all nodes start as miners
if not is_current_signer and health_check_unhealthy and stopped_producing:
    exit(0)

# node is reporting unhealthy for some other reason
if health_check_unhealthy and not stopped_producing:
    exit(0)

exit(0)
