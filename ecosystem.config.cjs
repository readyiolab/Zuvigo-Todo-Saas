/**
 * PM2 process file for production (EC2).
 *
 * Uses port 3017 so it does not collide with other apps on :3000.
 *
 * Usage (on server, from the app root that contains this file):
 *   pm2 delete zuvigo-todo   # if already started on wrong port
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * App listens on 127.0.0.1 only — nginx terminates TLS and proxies.
 */
module.exports = {
  apps: [
    {
      name: "zuvigo-todo",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3017 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3017",
      },
    },
  ],
};
