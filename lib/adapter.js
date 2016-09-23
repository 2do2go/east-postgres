'use strict';

var pg = require('pg'),
	path = require('path'),
	pgConnectionString = require('pg-connection-string');

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
	this._connectAndCreateMigrationsTable(function(err) {
		if (err && err.code === '3D000' && self.params.createDbOnConnect) {
			self._createDb(function(err) {
				if (err) return callback(err);
				// and try to connect another time
				self._connectAndCreateMigrationsTable(callback);
			});
		} else {
			callback.apply(null, arguments);
		}
	});
};

Adapter.prototype._connectAndCreateMigrationsTable = function(callback) {
	var self = this;
	this.db = new pg.Client(this.params.url);
	this.db.connect(function(err) {
		if (err) return callback(err);
		// create "migrations" table
		self._createMigrationsTable(function(err) {
			if (err) return callback(err);
			callback(null, {db: self.db});
		});
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
	// parse connection url
	var self = this,
		createParams = self.params.createDbParams,
		connectParams = pgConnectionString.parse(this.params.url),
		dbName = connectParams.database,
		postgresConnectUrl = this.params.url.replace('/' + dbName, '/postgres');

	// connect to postgres db
	var pgdb = new pg.Client(postgresConnectUrl);
	pgdb.connect(function(err) {
		if (err) return callback(err);

		var createQuery = 'create database "' + dbName + '" ' +
				'owner ' + connectParams.user +
				(createParams ? (' ' + createParams) : '') +
				';';
		// create db
		pgdb.query(createQuery, function(err) {
			pgdb.end();
			callback(err);
		});
	});
};

Adapter.prototype._createMigrationsTable = function(callback) {
	this.db.query(
		'create table if not exists _migrations (' +
			'name text primary key' +
		')',
		callback
	);
};

module.exports = Adapter;
