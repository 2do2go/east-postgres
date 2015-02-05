'use strict';

var pg = require('pg.js'),
	path = require('path');

var Adapter = function(params) {
	this.params = params || {};
	if (!this.params.url) {
		throw new Error('Connect params should be set');
	}
};

Adapter.prototype.getTemplatePath = function() {
	return path.join(__dirname, 'migrationTemplate.js');
};

Adapter.prototype.connect = function(callback) {
	var self = this;
	this.db = new pg.Client(this.params.url);
	this.db.connect(function(err) {
		if (err) {
			// if there is no target db and we have createDb option
			if (err.code === '3D000' && self.params.createDbOnConnect) {
				// then create db
				self._createDb(function(err) {
					if (err) {
						callback(err);
					} else {
						// and try to connect another time
						self.connect(callback);
					}
				});
			} else {
				// just throw error
				callback(err);
			}
		} else {
			// if connection is ok then try to create _migrations table
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
		}
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
	this.db.query('insert into _migrations values($1)', [name], function(err) {
		callback(err && err.code !== '23505' ? err : null);
	});
};

Adapter.prototype.unmarkExecuted = function(name, callback) {
	this.db.query('delete from _migrations where name=$1', [name], callback);
};

Adapter.prototype._createDb = function(callback) {
	var dbNameRegexp = /\/([^\/]+)$/,
		dbName = dbNameRegexp.exec(this.params.url)[1],
		postgresConnectUrl = this.params.url.replace(dbNameRegexp, '/postgres');

	// connect to postgres db
	var pgdb = new pg.Client(postgresConnectUrl);
	pgdb.connect(function(err) {
		if (err) return callback(err);

		// create db
		pgdb.query('create database ' + dbName + ';', function(err) {
			pgdb.end();
			callback(err);
		});
	});
};

module.exports = Adapter;
