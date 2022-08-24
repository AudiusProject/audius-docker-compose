module.exports = {
  apps: [
    {
      name: 'nats2',
      script: 'nats-server -c /etc/nats.conf --pid /tmp/nats.pid',
      exec_interpreter: 'none',
      exec_mode: 'fork_mode',
      restart_delay: 3000,
    },
    {
      name: 'clusterizer',
      script: 'build/src/server.js',
      node_args: '--experimental-modules --es-module-specifier-resolution=node',
      restart_delay: 3000,
    },
  ],
}
