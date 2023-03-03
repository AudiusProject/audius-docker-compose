#!/bin/bash

set -e # exit on error
docker ps # test if docker is installed on machine

# setup matching config to ubuntu
cd ../
if [[ "$1" != "" ]]; then
	read -p "Enable auto upgrade? [Y/n] " -n 1 -r
	echo
	if [[ "$REPLY" =~ ^([Yy]|)$ ]]; then
		audius-cli auto-upgrade
	fi

	audius-cli set-config --required "$1"

	read -p "Are you using an externally managed Postgres? [Y/n] " -n 1 -r
	echo
	if [[ "$REPLY" =~ ^([Yy]|)$ ]]; then
		read -p "Please enter db url: "

		case "$1" in
		"creator-node")
			audius-cli set-config creator-node dbUrl "$REPLY"
			;;
		"discovery-provider")
			audius-cli set-config discovery-provider audius_db_url "$REPLY"
			audius-cli set-config discovery-provider audius_db_url_read_replica "$REPLY"
			;;
		esac
	fi

	read -p "Launch the service? [Y/n] " -n 1 -r
	echo
	if [[ "$REPLY" =~ ^([Yy]|)$ ]]; then
		if [[ "$1" == "discovery-provider" ]]; then
			read -p "Seed discovery db from snapshot (takes ~1 hour)? [Y/n] " -n 1 -r
			echo
			if [[ "$REPLY" =~ ^([Yy]|)$ ]]; then
				extra_args="--seed"
			fi
		fi
		audius-cli launch $extra_args "$1" # do not pass --yes so that we check for machine requirements
	fi
fi
