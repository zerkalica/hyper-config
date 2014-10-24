var YAML = require('yamljs');
var path = require('path');
var fs = require('fs');

var loaders = {
	json: require,
	yml:  YAML.load.bind(YAML),
	yaml: YAML.load.bind(YAML)
};

function getConfigData(configPath, options) {
	var data = [];
	options = options || {};
	options.project = options.project || 'all';
	options.env = options.env || 'dev';
	fs.readdirSync(configPath).forEach(function addConfig(fileName) {
		var ext = path.extname(fileName);
		var loader = loaders[ext.substring(1)];
		if (!loader || fileName.indexOf('.disabled') !== -1) {
			return;
		}

		var parts = path.basename(fileName, ext).split('.');
		if (parts.length !== 2) {
			throw new Error('config format [project#]name.environment.(yml|json), given: ' + fileName);
		}
		var rec = parts[0].split('#');
		var isProject = rec.length === 2;
		var c = {
			configName: rec[isProject ? 1 : 0],
			project: isProject ? rec[0] : 'all',
			env: parts[1] || 'all'
		};

		var isActual = (
			(c.project === 'all' || c.project === options.project)
			&& (c.env === 'all' || c.env == options.env)
		);

		if (isActual) {
			data.push(loader(path.join(configPath, fileName)));
		}
	}.bind(this));

	return data;
}

function configLoader(dirNames, options, cb) {
	dirNames.forEach(function (dir) {
		getConfigData(dir, options).forEach(function addConfig(configData) {
			cb(configData);
		});
	});
}

module.exports = configLoader;
