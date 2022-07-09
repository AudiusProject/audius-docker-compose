#!/usr/bin/bash

# Script to update the chainspec with the genesis vanity data.
# The script uses the override.env set environment to pull the
# requisite keys for sealing blocks.
#
# This script is only meant to be run by the genesis validator
# of the network.

set -e # exit on error

# set current directory to script directory
cd "$(dirname "$0")"

source ../override.env

EXTRA_VANITY="0x22466c6578692069732061207468696e6722202d204166726900000000000000"
EXTRA_SEAL="0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
SIGNER=${audius_delegate_owner_wallet//'0x'/''} # trim 0x from pubkey

EXTRA_DATA=${EXTRA_VANITY}${SIGNER}${EXTRA_SEAL}

echo "Genesis EXTRA_DATA:"
echo $EXTRA_DATA

cat spec.json | jq '.genesis.extraData = '\"$EXTRA_DATA\"'' > spec.tmp && mv spec.tmp spec.json