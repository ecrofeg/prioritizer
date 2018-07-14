const path = require('path');
const webpack = require('webpack');
const isDevMode = process.env.NODE_ENV === 'dev';

const config = {
	context: __dirname,

	entry: './src/server/main.ts',

	watch: isDevMode,

	watchOptions: {
		ignored: /node_modules/,
		aggregateTimeout: 300
	},

	output: {
		path: path.resolve(__dirname, 'build'),
		filename: 'main.js'
	},

	resolve: {
		modules: [
			'node_modules',
			path.resolve(__dirname, 'src/server')
		],
		extensions: ['.ts', '.js', '.json' ]
	},

	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},

	plugins: [
		new webpack.NoEmitOnErrorsPlugin()
	]
};

config.plugins.push(
	new webpack.DefinePlugin({
		'process.env': {
			NODE_ENV: JSON.stringify(isDevMode ? 'development' : 'production')
		}
	})
);

module.exports = config;
