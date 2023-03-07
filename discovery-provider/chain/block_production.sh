function blocknum() {
    res=$(curl -s --data '{"method":"eth_blockNumber","params":[],"id":1,"jsonrpc":"2.0"}' -H "Content-Type: application/json" -X POST https://acdc-gateway.audius.co)
    block_res=$( jq -r '.result' <<< "${res}")
    block_num=$(($block_res))
    echo $block_num
}

block_num_1=$(blocknum)
sleep 5
block_num_2=$(blocknum)

    if (( $block_num_2 == $block_num_1)); then
        echo "blocks not being produced, restarting"
        exit 1
    fi
