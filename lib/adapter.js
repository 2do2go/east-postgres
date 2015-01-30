'use strict';

var pg = require('pg'),
	path = require('path');

var Adapter = function(params) {
	this.params = params || {};
	if (!this.params.connectParams) {
		throw new Error('Connect params should be set');
	}
	var connectParams = this.params.connectParams;
	if (!connectParams.user) {
		throw new Error('Db user should be set');
	}
	if (!connectParams.password) {
		throw new Error('Db user\'s password should be set');
	}
	if (!connectParams.database){
		throw new Error('Database should be set');
	}
	if (!connectParams.host) {
		throw new Error('Host should be set');
	}
};

Adapter.prototype.getTemplatePath = function() {
	return path.join(__dirname, 'migrationTemplate.js');
};

Adapter.prototype.connect = function(callback) {
	var self = this;
	this.db = new pg.Client(this.params.connectParams);
	this.db.connect(function(err) {
		if (err) return callback(err);
		self.db.query(
			'create table if not exists _migrations (' +
				'name text primary key' +
			')',
			function(err) {
				if (err) {
					callback(err);
				} else {
					callback(null, {db: self.db});
				}
			}
		);
	});
};

Adapter.prototype.disconnect = function(callback) {
	this.db.end();
	callback();
};

Adapter.prototype.getExecutedMigrationNames = function(callback) {
	this.db.query('select name from _migrations', function(err, result) {
		if (err) return callback(err);
		callback(null, result.rows.map(function(migration) {
			return migration.name;
		}));
	});
};

Adapter.prototype.markExecuted = function(name, callback) {
	this.db.query('insert into _migrations values($1)', {
		$1: name
	}, function(err) {
		var util = require('util');
		console.log('err.message:', util.inspect(err, false, null));
		callback();
	});
};

Adapter.prototype.unmarkExecuted = function(name, callback) {
	this.db.query('delete from _migrations where name=$1', {
		$1: name
	}, callback);
};

module.exports = Adapter;
