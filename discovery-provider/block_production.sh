res_1=$(curl -s --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST localhost:8545)
block_res_1=$( jq -r '.result' <<< "${res_1}")
block_num_1=$(($block_res_1))
echo $block_num_1
sleep 5
res_2=$(curl -s --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST localhost:8545)
block_res_2=$( jq -r '.result' <<< "${res_2}")
block_num_2=$(($block_res_2))
echo $block_num_2

if (( $block_num_2 == $block_num_1)); then
    echo "blocks not being produced, restarting"
    exit 1
fi
