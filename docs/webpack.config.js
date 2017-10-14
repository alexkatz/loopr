const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const config = {
    entry: {
        app: ['./src/index.tsx'],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname + '/dist'),
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    devServer: {
        contentBase: path.resolve(__dirname + '/dist'),
    },
    plugins: [
        new CopyWebpackPlugin([
            { from: './index.html', to: './' },
        ]),
    ],
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
            { enforce: 'pre', test: /\.js$/, loader: 'source-map-loader' }
        ],
    },
};

module.exports = config;