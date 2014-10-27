var proto;
var traverse = require('traverse');

function escapeRegExp(string){
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}


function pathToArray(path) {
	return (path || '').split('.');
}

function merge(acc, val) {
	if (Array.isArray(val)) {
		acc.set(this.path, []);
	} else if (typeof val !== 'object') {
		if (typeof val === 'function') {
			throw new Error('Can\'t add functions to config: ' + this.path.join('.') + ' ' + val.toString());
		}
		acc.set(this.path, val);
	}
	return acc;
}

var REF_MAGIC = '\1\1';
var REF_MAGIC_REGEXP = RegExp(escapeRegExp(REF_MAGIC), 'g');

function normalize(acc, val) {
	function get(path) {
		return acc.config.get(pathToArray(path));
	}

	if (typeof val === 'string') {
		var value = val.replace(acc.refIgnoreRegExp, REF_MAGIC);
		var refPos = value.indexOf(acc.refLabel);
		if (refPos !== -1) {
			var command = value.substring(refPos + 1);
			var lastRefPos = command.lastIndexOf(acc.refLabel);
			if (command === 'disable') {
				this.remove();
			} else if (lastRefPos === -1) {
				this.update(get(command));
			} else {
				value = value.replace(acc.refRegExp, function replaceMacro(val, path) {
					return get(path);
				}.bind(this));
			}
		}
		if(value !== val) {
			this.update(value.replace(REF_MAGIC_REGEXP, acc.refLabel));
		}
	}
	if (this.key && this.key.indexOf(acc.refLabel) === 0) {
		normalizer = acc.normalizers[this.key.substring(1)];
		normalizer && normalizer(val, this, acc);
	}

	return acc;
}

function checkCircular(val) {
	if (this.circular) {
		throw new Error('circular deps detected: ' + this.path.join('.'));
	}
}

function extractTags(val, obj, acc) {
	var path = obj.path.slice(0, obj.path.length - 1);

	for (var i = 0, j = val.length; i < j; i++) {
		var tag = val[i];
		if (!Array.isArray(acc.tags[tag])) {
			acc.tags[tag] = [];
		}
		acc.tags[tag].push(path);
	}
	obj.remove();
}

function HyperConfig(options) {
	this.name = 'HyperConfig';
	if (!(this instanceof HyperConfig)) {
		return new HyperConfig(options);
	}
	options = options || {};
	this._refLabel = options.refLabel || '@';
	this._refRegExp = RegExp(escapeRegExp(this._refLabel) + '(.*?)' + escapeRegExp(this._refLabel) , 'g');
	this._refIgnoreRegExp = RegExp(escapeRegExp(this._refLabel + this._refLabel) , 'g');

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
	traverse(config).reduce(merge, this._config);

	return this;
};

proto.addNormalizer = function addNormalizer(name, normalizer) {
	this._normalizers[name] = normalizer;
};

/**
 * Build config
 *
 * @return {Object} tags Config, aggregated by tags
 * @return {Object.<Traverse>} config traverse object of config tree
 */
proto.build = function build() {
	var acc = this._config.reduce(normalize, {
		config: this._config,
		refLabel: this._refLabel,
		refRegExp: this._refRegExp,
		refIgnoreRegExp: this._refIgnoreRegExp,
		tags: {},
		normalizers: this._normalizers
	});
	acc.config.forEach(checkCircular);
	this._isBuilded = true;

	return new HyperConfigSession({
		tags: acc.tags,
		config: acc.config,
		refLabel: acc.refLabel
	});
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

proto.getPathsByTag = function getPathsByTag(tag) {
	return Array.isArray(this._tags[tag]) ? this._tags[tag] : [];
};

proto.getByTag = function getByTag(tag) {
	return this.getPathsByTag(tag).map(function (path) {
		return this._config.get(path);
	}.bind(this));
};

module.exports = HyperConfig;
