var proto;
var traverse = require('traverse');

function escapeRegExp(string){
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function pathToArray(path) {
	return (path || '').split('.');
}

function merge(acc, val) {
	var path = this.path.reduce(function (acc, nodeName) {
		nodeName.split('.').forEach(function add(v) {
			acc.push(v);
		});
		return acc;
	}, []);

	if (Array.isArray(val)) {
		acc.set(path, []);
	} else if (typeof val !== 'object') {
		if (typeof val === 'function' && val[acc.annotationLabel + 'definition']) {
			acc.defs.push(val[acc.annotationLabel + 'definition']);
			acc.set(path, val[acc.annotationLabel + 'name']);
		} else {
			acc.set(path, val);
		}
	} else if (typeof acc.get(path) !== 'object') {
		acc.set(path, {});
	}

	return acc;
}

var REF_MAGIC = '\1\1';
var REF_MAGIC_REGEXP = RegExp(escapeRegExp(REF_MAGIC), 'g');

/**
 * Normalize config value
 *
 * @param  {object} acc reduce acc
 * @param  {any} val config value
 * 
 * @return {object} reduce acc
 */
function normalize(acc, val) {
	if (typeof val === 'string') {
		var value = val.trim().replace(acc.refIgnoreRegExp, REF_MAGIC);
		if (value.indexOf(acc.refLabel) === 0 && value.indexOf(acc.refLabel + acc.macroBegin) === -1) {
			value = value.substring(acc.refLabel.length);
			this.update(acc.get(value));
		} else if (value.indexOf(acc.refLabel + 'disable') === 0) {
			this.remove();
		} else {
			value = value.replace(acc.refRegExp, function replaceMacro(val, path) {
				return acc.get(path);
			});
			this.update(value.replace(REF_MAGIC_REGEXP, acc.refLabel));
		}
	}
	var key = this.key;
	if (key && key.indexOf(acc.annotationLabel) === 0) {
		normalizer = acc.normalizers[key.substring(acc.annotationLabel.length)];
		if (normalizer) {
			normalizer(acc, val, this);
		}
	}

	return acc;
}

function checkCircular(val) {
	if (this.circular) {
		throw new Error('circular deps detected: ' + this.path.join('.'));
	}
}

function extractTags(acc, val, obj) {
	var path = obj.path.slice(0, obj.path.length - 1);
	var result = acc.result;

	for (var i = 0, j = val.length; i < j; i++) {
		var tag = val[i];
		if (!Array.isArray(result.tags[tag])) {
			result.tags[tag] = [];
		}
		result.tags[tag].push(path);
	}
	//obj.remove();
}

extractTags.init = {
	tags: {}
};

/**
 * Hyper config builder
 * 
 * @param {object} options Options
 * @param {string} options.refLabel '~'
 * @param {string} options.annotationLabel &
 * @param {string} options.macroBegin {
 * @param {string} options.macroEnd }
 */
function HyperConfig(options) {
	this.name = 'HyperConfig';
	if (!(this instanceof HyperConfig)) {
		return new HyperConfig(options);
	}
	options = options || {};
	this._refLabel = options.refLabel || '~';
	this._annotationLabel = options.annotationLabel || '@';
	this._macroBegin = options.macroBegin || '{';
	this._macroEnd = options.macroEnd || '}';

	this._config = traverse({});
	this._isBuilded = false;
	this._normalizers = {};
	this.addNormalizer('tags', extractTags);
}
proto = HyperConfig.prototype;

proto.addConfig = function addConfig(config) {
	if (this._isBuilded) {
		throw new Error('Can\'t add config after build');
	}

	var set = this._config.set.bind(this._config);
	var get = this._config.get.bind(this._config);

	var acc = traverse(config).reduce(merge, {
		annotationLabel: this._annotationLabel,
		set: set,
		get: get,
		defs: []
	});

	acc.defs.forEach(function addConfigFromDefs(config) {
		traverse(config).reduce(merge, {
			set: set,
			get: get,
			defs: []
		});
	}.bind(this));

	return this;
};

proto.addNormalizer = function addNormalizer(name, normalizer) {
	this._normalizers[name] = normalizer;
};

proto._getConfig = function _getConfig(path) {
	return this._config.get(pathToArray(path));
};

/**
 * Build config
 *
 * @return {HyperConfigSession}
 */
proto.build = function build() {
	var refRegExp = RegExp(
		escapeRegExp(this._refLabel) +
		escapeRegExp(this._macroBegin) +
		'(.*?)' +
		escapeRegExp(this._macroEnd),
		'g'
	);

	var initDefaults = {
		get: this._getConfig.bind(this),
		refLabel: this._refLabel,
		annotationLabel: this._annotationLabel,
		macroBegin: this._macroBegin,
		refRegExp: refRegExp,
		refIgnoreRegExp: RegExp(escapeRegExp(this._refLabel + this._refLabel) , 'g'),
		normalizers: this._normalizers,
		result: {
			config: this._config
		}
	};

	for (var name in this._normalizers) {
		var initParts = this._normalizers[name].init;
		if (initParts) {
			for (var initPropName in initParts) {
				initDefaults.result[initPropName] = initParts[initPropName];
			}
		}
	}

	var acc = this._config.reduce(normalize, initDefaults);
	var result = acc.result;

	result.config.forEach(checkCircular);
	this._isBuilded = true;

	return new HyperConfigSession(result);
};

function HyperConfigSession(options) {
	this._tags = options.tags;
	this._config = options.config;
}
proto = HyperConfigSession.prototype;

proto.clone = function clone() {
	return new HyperConfigSession({
		config: traverse(this._config.clone()),
		tags: this._tags
	});
};

proto.get = function get(path) {
	return this._config.get(pathToArray(path));
};

proto._getPathsByTag = function _getPathsByTag(tag) {
	return Array.isArray(this._tags[tag]) ? this._tags[tag] : [];
};

proto.getByTag = function getByTag(tag) {
	return this._getPathsByTag(tag).map(function (path) {
		return this._config.get(path);
	}.bind(this));
};

module.exports = HyperConfig;
