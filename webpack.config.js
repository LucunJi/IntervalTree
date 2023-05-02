const path = require('path');

module.exports = {
    entry: {
        index: './src/index.ts',
    },
    externals: {
        jquery: 'jQuery',
        jsxgraph: 'JXG',
        bootstrap: 'bootstrap'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    }
};