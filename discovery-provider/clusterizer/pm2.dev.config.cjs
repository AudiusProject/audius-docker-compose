module.exports = {
  apps: [
    {
      name: 'nats2',
      script: 'nats-server -c /nats/server.conf --pid /tmp/nats.pid',
      exec_interpreter: 'none',
      exec_mode: 'fork_mode',
      restart_delay: 3000,
    },
    {
      name: 'clusterizer',
      // script: 'build/src/server.js',
      // node_args: '--experimental-modules --es-module-specifier-resolution=node',

      script: 'npm run dev',
      exec_interpreter: 'none',
      restart_delay: 3000,
    },
  ],
}
