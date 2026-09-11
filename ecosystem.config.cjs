/**
 * PM2 process file for production (EC2).
 *
 * Usage (on server):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * App must listen on 127.0.0.1 only — nginx terminates TLS and proxies.
 * Override cwd with: pm2 start ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: "zuvigo-todo",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
