# east sqlite

sqlite adapter for [east](https://github.com/okv/east) (node.js database migration tool) which uses 
[node-sqlite3](https://github.com/mapbox/node-sqlite3)

All executed migrations names will be stored at `_migrations` table in the
current database. Object with following properties will be passed to `migrate`
and `rollback` functions:

* `db` - instance of [node-sqlite3](http://github.com/mapbox/node-sqlite3/wiki/API#databaserunsql-param--callback)


## Installation

```sh
npm install east east-sqlite -g
```

alternatively you could install it locally


## Usage

go to project dir and run

```sh
east init
```

create `.eastrc` file at current directory

```js
{
	"adapter": "east-sqlite",
	"dbFile": ""
}
```

where `dbFile` is file of database which you want to migrate

now we can create some migrations

```sh
east create apples
east create bananas
```

created files will looks like this one

```js
exports.migrate = function(client, done) {
	var db = client.db;
	done();
};

exports.rollback = function(client, done) {
	var db = client.db;
	done();
};
```

edit created files and insert  

to 1_apples

```js
exports.migrate = function(client, done) {
	var db = client.db;
	var sqlStr = 'insert into things values($id, $name, $color)';
	db.run(sqlStr, {
		$id: 1,
		$name: 'apple',
		$color: 'red'
	}, function(err) {
		if (err) return done(err);
		db.run(sqlStr, {
			$id: 2,
			$name: 'apple',
			$color: 'green'
		}, done);
	});
};

exports.rollback = function(client, done) {
	var db = client.db;
	db.run('delete from things where id in (1, 2)', done);
};
```

to 2_bananas

```js
exports.migrate = function(client, done) {
	var db = client.db;
	db.run('insert into things values($id, $name, $color)', {
		$id: 3,
		$name: 'banana',
		$color: 'yellow'
	}, done);
};

exports.rollback = function(client, done) {
	var db = client.db;
	db.run('delete from things where id=3', done);
};
```

now we can execute our migrations

```sh
east migrate
```

output

```sh
target migrations:
	1_apples
	2_bananas
migrate `1_apples`
migration done
migrate `2_bananas`
migration done
```

and roll them back

```sh
east rollback
```

output

```sh
target migrations:
	2_bananas
	1_apples
rollback `2_bananas`
migration successfully rolled back
rollback `1_apples`
migration successfully rolled back
```

you can specify one or several particular migrations for migrate/rollback e.g.

```sh
east migrate 1_apples
```

or

```sh
east migrate 1_apples 2_bananas
```

Run `east -h` to see all commands, `east <command> -h` to see detail command help,
see also [east page](https://github.com/okv/east#usage) for command examples.


## Running test

run [east](https://github.com/okv/east#running-test) tests with this adapter
