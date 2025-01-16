module.exports = {
  apps: [{
    name: '12properties',
    script: './bin/www',
    env: {
      NODE_ENV: 'production',
      HTTP_PORT: 80,
      HTTPS_PORT: 443
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}; 