#!/usr/bin/bash

set -e # exit on error

# set current directory to script directory
cd "$(dirname "$0")"

# upgrade the system
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -y
sudo apt-get dist-upgrade -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release jq

# install docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker

# limit log size in docker
cat <<EOF | sudo tee /etc/docker/daemon.json >/dev/null
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# allow current user to use docker without sudo
sudo usermod -aG docker $USER
sudo chmod 666 /var/run/docker.sock

# install docker-compose
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.2.3/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# create directories for volumes
sudo mkdir -p /var/k8s
sudo chown $(id -u):$(id -g) /var/k8s

# audius-cli setup
sudo apt install -y python3 python3-pip
sudo python3 -m pip install -r requirements.txt
sudo ln -sf $PWD/audius-cli /usr/local/bin/audius-cli
echo 'eval "$(_AUDIUS_CLI_COMPLETE=bash_source audius-cli)"' >>~/.bashrc
touch creator-node/override.env
touch creator-node/.env
touch discovery-provider/override.env
touch discovery-provider/.env
touch identity-service/override.env
touch identity-service/.env
touch ddex/override.env
touch ddex/.env

# check if ubuntu version is 20.04 or 22.04
UBUNTU_VERSION=$(cat /etc/os-release | grep VERSION_ID)
if [[ ! $UBUNTU_VERSION =~ 20.04|22.04 ]]; then
	echo "Unsupported version of Ubuntu, please run version 20.04 or 22.04"
	read -p "Continue with setup? [Y/n] " -n 1 -r
	echo $REPLY
	if [[ "$REPLY" =~ ^(Nn]|)$ ]]; then
		exit 1
	fi
fi

# check if ubuntu kernel version is 5.10+
UBUNTU_KERNEL_VERSION=$(uname -r)
if [[ ! $UBUNTU_KERNEL_VERSION =~ 5\.[1-9][0-9] ]]; then
	echo "Unsupported version of Ubuntu kernel, please run version 5.13 or higher"
	read -p "Continue with setup? [Y/n] " -n 1 -r
	echo
	if [[ "$REPLY" =~ ^([Nn]|)$ ]]; then
		exit 1
	fi
fi

# setup service
if [[ "$1" != "" ]]; then
	read -p "Enable auto upgrade? [Y/n] " -n 1 -r
	echo
	if [[ "$REPLY" =~ ^([Yy]|)$ ]]; then
		audius-cli auto-upgrade
	fi

	audius-cli set-config --required "$1"

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

# reboot machine
read -p "Reboot Machine? [Y/n] " -n 1 -r
echo
if [[ ! "$REPLY" =~ ^([Yy]|)$ ]]; then
	exit 1
fi

sudo reboot
