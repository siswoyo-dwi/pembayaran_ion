module.exports = {
    apps : [{
      name: "app",
      script: "./src/app.js",
      env: {
        NODE_ENV: "development",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }]
  }
  