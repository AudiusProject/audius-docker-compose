import requests
import time

RPC_URL = "localhost:8545"
HEALTH_URL = RPC_URL + "/health"
SCAN_SLEEP = 10  # seconds


def scan():
    # 1. get all data
    print("gathering health, block number, and signers")
    health_res = health()
    syncing_res = rpc("eth_syncing")
    block_number_res = rpc("eth_blockNumber")
    signers_res = rpc("clique_getSigners")
    local_addr_res = rpc("net_localAddress")
    snapshot_res = rpc("clique_getSnapshot")

    # 2. analyze data and see if node is rogue
    # 3. if rogue, reset chain head back in time
    return


def rpc(method, params=[]):
    data = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
    return requests.post(RPC_URL, data=data).json().result


def health():
    return requests.get(HEALTH_URL).json()


# loops scan indefinitely
# looking for deadlocks and resetting chain
# if noticed
while True:
    time.sleep(SCAN_SLEEP)
    scan()
