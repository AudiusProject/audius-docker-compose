module.exports = {
  apps: [
    {
      name: 'nats-server',
      script: 'nats-server -c /etc/nats.conf',
      exec_interpreter: 'none',
    },
    {
      name: 'clusterizer',
      script: 'build/src/server.js',
      node_args: '--experimental-modules --es-module-specifier-resolution=node',
      restart_delay: 3000,
    },
  ],
}
