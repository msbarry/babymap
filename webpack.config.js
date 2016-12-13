/* eslint strict: 0 */

'use strict';

const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const postcssImport = require('postcss-import');
const postcssReporter = require('postcss-reporter');
const postcssNested = require('postcss-nested');
const autoprefixer = require('autoprefixer');

const PROD = process.env.NODE_ENV === 'production';

let entry;
let plugins;
let cssLoaderParams;
let cssLoaders;
let devtool;

if (PROD) {
  entry = [
    path.resolve(__dirname, 'src/index.js'),
  ];
  cssLoaderParams = [
    'importLoaders=1'
  ].join('&');
  cssLoaders = ExtractTextPlugin.extract(
    'style-loader',
    `css-loader?${cssLoaderParams}!postcss-loader`
  );
  plugins = [
    new webpack.optimize.UglifyJsPlugin({
      mangle: true,
      compress: {
        drop_console: true,
        unused: true,
        evaluate: true,
        warnings: false
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      inject: true
    }),
    new ExtractTextPlugin('[name].[contenthash].css'),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ];
} else {
  devtool = 'cheap-eval-source-map';
  entry = [
    'webpack-dev-server/client?http://localhost:3000/',
    path.resolve(__dirname, 'src/index.js')
  ];
  cssLoaderParams = [
    'sourceMap',
    'importLoaders=1'
  ].join('&');
  cssLoaders = `style-loader!css-loader?${cssLoaderParams}!postcss-loader`;
  plugins = [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      inject: true,
      devServer: 3000,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.NoErrorsPlugin()
  ];
}

module.exports = {
  devtool,
  entry: {
    bundle: entry
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: PROD ? '[name].[chunkhash].js' : '[name].js',
    publicPath: PROD ? 'https://msbarry.github.io/babymap/' : undefined
  },
  module: {
    loaders: [
      {
        test: /\.png$/,
        loader: 'file-loader'
      },
      {
        test: /\.css$/,
        loader: cssLoaders
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(json)$/,
        exclude: /node_modules/,
        loader: 'json-loader'
      },
      {
        test: /\.(tsv)$/,
        loader: 'text-loader'
      }
    ],
  },
  resolve: {
    extensions: ['', '.js']
  },
  postcss() {
    return [
      postcssImport({
        glob: true,
        onImport: function onImport(files) {
          files.forEach(this.addDependency);
        }.bind(this)
      }),
      postcssNested(),
      autoprefixer({
        browsers: ['last 2 versions', 'IE > 8']
      }),
      postcssReporter({
        clearMessages: true
      })
    ];
  },
  plugins
};
