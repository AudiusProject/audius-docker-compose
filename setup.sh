#!/usr/bin/bash

set -x

# set current directory to script directory
cd "$(dirname "$0")"

# upgrade the system
sudo apt-get update -y
sudo apt-get dist-upgrade -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release jq

# install docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# limit log size in docker
cat <<EOF | sudo tee /dev/null >/etc/docker/daemon.json
{
	"max-concurrent-downloads": 20,
	"max-concurrent-uploads": 20,
	"max-download-queue-size": 20,
	"max-upload-queue-size": 20
}
EOF

# allow current user to use docker without sudo
sudo usermod -aG docker $USER

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

# setup service
if [[ $1 == "" ]]; then
	audius-cli set-config --required $1
	read -p "Launch the service? [Y/n] " -n 1 -r
	if [[ $REPLY =~ ^([Yy]|)$ ]]; then
		audius-cli launch $1
	fi
fi

# reboot machine
read -p "Reboot Machine? [Y/n] " -n 1 -r
if [[ ! $REPLY =~ ^([Yy]|)$ ]]; then
	exit 1
fi

sudo reboot
