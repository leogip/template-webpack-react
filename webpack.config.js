const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const os = require('os');
let selfIp;
try {
  selfIp = os.networkInterfaces()['WLAN'][1].address;
} catch {
  selfIp = 'localhost'
}

const devMode = process.env.NODE_ENV === 'development'
const prodMode = process.env.NODE_ENV === 'production'

function resolve(relatedPath) {
  return path.join(__dirname, relatedPath)
}

const PORT = 8888

const getStaticFileName = (folder) => prodMode ?
  `static/${folder}/[name].[hash:8].[ext]` :
  `static/${folder}/[name].[ext]`;

const getStyleLoader = () => {
  return [
    devMode && 'style-loader',
    prodMode && {
      loader: MiniCssExtractPlugin.loader,
    },
    {
      loader: 'css-loader',
      options: { importLoaders: 1 },
    },
    {
      loader: 'postcss-loader',
      options: {
        sourceMap: true,
      },
    },
  ].filter(Boolean);
};

const getOptimization = () => {
  return {
    usedExports: true,
    runtimeChunk: {
      name: 'runtime'
    },
    splitChunks: {
      chunks: "all",
      minSize: 30000,
      minChunks: 1,
      name: true,
      automaticNameDelimiter: '~',
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          minChunks: 1,
          priority: -10,
          reuseExistingChunk: true,
          enforce: true,
        },
      },
    },
    minimizer: [
      new TerserJSPlugin({
        cache: path.resolve('.cache'),
        parallel: 4,
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ]
  }

}

const getPlugins = () => {
  return [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': devMode ? JSON.stringify('development') : prodMode && JSON.stringify('production'),
      IS_DEVELOPMETN: devMode,
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin(
      Object.assign(
        {},
        {
          inject: true,
          template: 'public/index.html',
        },
        prodMode ?
          {
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
              minifyURLs: true,
            },
          }
          : undefined,
      ),
    ),
    devMode && new webpack.HotModuleReplacementPlugin(),
    prodMode && new MiniCssExtractPlugin({
      filename: 'css/style.[contenthash].css',
      chunkFilename: 'css/style.[contenthash].[id].css'
    }),
    prodMode && new BundleAnalyzerPlugin({ analyzerMode: 'static' }),
    prodMode && new OptimizeCSSAssetsPlugin(),
  ].filter(Boolean)
}

module.exports = {
  mode: prodMode ? 'production' : devMode && 'development',
  output: {
    path: resolve('/dist'),
    filename: devMode ? 'js/[name].[hash].js' : 'js/[name].[contenthash].js',
    chunkFilename: devMode ? 'chunks/[name].[hash:4].js' : 'chunks/[name].[contenthash].js',
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [
      resolve('node_modules'),
    ],
    alias: {
      '@src': path.join(__dirname, '/src'),
      '@actions': path.join(__dirname, '/src/redux/actions'),
      '@reducers': path.join(__dirname, '/src/app/redux/reducers'),
      '@components': path.join(__dirname, '/src/components'),
      '@pages': path.join(__dirname, '/src/pages'),
      '@styles': path.join(__dirname, '/src/styles'),
      '@services': path.join(__dirname, '/src/services'),
      '@hoc': path.join(__dirname, '/src/components/hoc'),
    },
  },
  devtool: devMode ? 'source-map' : prodMode && 'cheap-module-source-map',
  devServer: {
    historyApiFallback: false,
    open: true,
    hot: true,
    host: selfIp,
    port: PORT,
  },
  optimization: getOptimization(),
  module: {
    rules: [
      // eslint preloader
      {
        enforce: 'pre',
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          cache: true,
          failOnError: true,
        },
      },
      {
        test: /\.js[x]?$/,
        exclude: /node_modules/,
        include: [resolve('./src')],
        use: ['babel-loader', 'eslint-loader'],
      },
      {
        test: /\.css$/i,
        use: getStyleLoader()
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        exclude: /node_modules/,
        include: [resolve('/src/images')],
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: getStaticFileName('images'),
          fallback: {
            loader: `file-loader`,
            options: { name: getStaticFileName('images') },
          },
        }
      },
      {
        test: /\.(woff|eot|ttf|svg|gif)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
          name: getStaticFileName('fonts')
        }
      },
    ],
  },
  performance: false,
  plugins: getPlugins(),
};
