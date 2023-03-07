#!/bin/bash

status=$(jq .status test.json)
healthy="Unhealthy"
if [ $status==$healthy ]; then
    echo "healthy"
fi
