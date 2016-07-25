module.exports = {
  entry: {
    'perceptron-visualizer': './src/perceptron-visualizer.ts',
  },
  output: {
    path: __dirname + "/dist",
    filename: '[name].js',
    library: 'perceptron-visualizer',
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.map$/, loader: 'ignore-loader' },
      { test: /\.d.ts$/, loader: 'ignore-loader' },
      { test: /\.ts$/, exclude: /\.d.ts$/, loader: 'ts-loader' },
      { test: /\.json$/, loader: 'json-loader' }
    ]
  }
};