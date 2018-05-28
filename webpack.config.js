const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require('path');

module.exports = env => {
  return {
    entry: {
      main: ['./demo/index.js']
    },
    output: {
      path: path.join(__dirname, "dist"),
      filename: "[name]/index.js"
    },
    devServer: {
      contentBase: path.join(__dirname, "demo"), // 该配置用于配置 devserver 启动 src 目录下的所有页面
      port: 8080
    },
    module: {
      rules: [{
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        },
        {
          test: /\.vue$/,
          use: {
            loader: "vue-loader",
            options: {
              postcss: [
                require('postcss-px2rem')({
                  remUnit: 72
                })
              ]

            }
          }
        },
        {
          test: /\.html$/,
          use: [{
            loader: "html-loader",
            options: {
              minimize: false
            }
          }]
        }
      ]
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: "./demo/index.html",
        filename: "./index.html"
      })
    ]
  }
};
