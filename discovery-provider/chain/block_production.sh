#!/bin/sh
res_1=$$(curl -s --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST https://acdc-gateway.audius.co | jq -r '.result')
block_num_1=$$res_1
sleep 5
res_2=$$(curl -s --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST https://acdc-gateway.audius.co | jq -r '.result')
block_num_2=$$res_2

if [ "$$block_num_2" = "$$block_num_1" ]; then
    echo "blocks not being produced, restarting"
    exit 1
fi
