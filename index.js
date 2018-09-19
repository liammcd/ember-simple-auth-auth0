'use strict';

const webpack = require('webpack');

module.exports = {
  name: 'ember-simple-auth-auth0',
  options: {
    autoImport:{
      webpack: {
        performance: {
          maxEntrypointSize: 1048576, // 1 MiB
          maxAssetSize: 1048576
        },
        plugins: [
          new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
          })
        ]
      }
    }
  }
};
