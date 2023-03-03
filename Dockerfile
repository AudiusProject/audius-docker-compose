FROM jrei/systemd-ubuntu:22.04

LABEL maintainer="alec@audius.co"
LABEL version="0.1.0"
LABEL description="image for audius-sandbox"

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y
RUN apt-get dist-upgrade -y
RUN apt-get upgrade -y
RUN apt-get install -y ca-certificates curl gnupg lsb-release jq git-all sudo

# copy parent dir to local dir
COPY install.sh /local/

CMD ["./local/install.sh"]

# EXPOST audius ports here
