var _ = require('lodash'),
	admzip = require('adm-zip'),
	blessed = require('blessed'),
	contrib = require('blessed-contrib'),
	exec = require('child_process').exec,
	fs = require('fs-extra'),
	net = require('net'),
	path = require('path'),
	tiappXml = require('tiapp.xml');

var DEBUG = false;

var IOS_TI_STATS_ZIP = 'be.k0suke.tistats-iphone-1.0.1.zip',
	IOS_TI_STATS_VER = '1.0.1',
	ANDROID_TI_STATS_ZIP = 'be.k0suke.tistats-android-1.0.0.zip',
	ANDROID_TI_STATS_VER = '1.0.0';

var logger, platform;
var screen, grid, lines, datas;

exports.cliVersion = '>=3.2';
exports.init = function(_logger, config, cli, appc){
	logger = _logger;

	if (process.argv.indexOf('ios') > -1) {
		platform = 'ios';
	} else if (process.argv.indexOf('android') > -1) {
		platform = 'android';
	}

	if (platform &&
		process.argv.indexOf('--tistats') > -1) {
		// force quiet
		if (!DEBUG) {
			config.cli.quiet = true;
		}

		var zip, entries;
		if (platform === 'ios' &&
			!fs.existsSync(path.join(appc.environ.installPath, 'modules', 'iphone', 'be.k0suke.tistats', IOS_TI_STATS_VER))) {
			logger.debug('Extracting TiStats module ' + IOS_TI_STATS_ZIP + ' files...');
			zip = admzip(path.join(__dirname, IOS_TI_STATS_ZIP));
			entries = zip.getEntries();
			_.each(entries, function(entry){
				if (entry.isDirectory) {
					return;
				}
				logger.debug(path.join(appc.environ.installPath, entry.entryName));
				fs.outputFileSync(path.join(appc.environ.installPath, entry.entryName), entry.getData());
			});
		} else if (platform === 'android' &&
			!fs.existsSync(path.join(appc.environ.installPath, 'modules', 'android', 'be.k0suke.tistats', ANDROID_TI_STATS_VER))) {
			logger.debug('Extracting TiStats module ' + ANDROID_TI_STATS_ZIP + ' files...');
			zip = admzip(path.join(__dirname, ANDROID_TI_STATS_ZIP));
			entries = zip.getEntries();
			_.each(entries, function(entry){
				if (entry.isDirectory) {
					return;
				}
				logger.debug(path.join(appc.environ.installPath, entry.entryName));
				fs.outputFileSync(path.join(appc.environ.installPath, entry.entryName), entry.getData());
			});
		}

		cli.on('build.pre.construct', construct);
		cli.on('build.finalize', finalize);
	}
};

function construct(data, finished) {
	var tiapp = tiappXml.load(path.join(data.projectDir, 'tiapp.xml'));
	if (platform === 'ios') {
		tiapp.setModule('be.k0suke.tistats', IOS_TI_STATS_VER, 'iphone');
		tiapp.write();

		if (!DEBUG) {
			screen = blessed.screen();
			screen.key(['escape', 'q', 'C-c'], function(ch, key){
				tiapp.removeModule('be.k0suke.tistats', 'iphone');
				tiapp.write();

				process.exit(0);
			});

			grid = new contrib.grid({
					rows: 4,
					cols: 2
				});

			_.each([
					['Views in App', 'Free Memory [MB]'],
					['Resident Size / msec [MB]', 'Resident Size [MB]'],
					['Virtual Size / msec [MB]', 'Virtual Size [MB]'],
					['User Time [msec]', 'System Time [msec]']
				], function(rows, row){
					_.each(rows, function(cols, col){
						grid.set(row, col, contrib.line, {
							style: {
								line: 'yellow',
								text: 'green',
								baseline: 'black'
							},
							xLabelPadding: 10,
							xPadding: 12,
							label: ' ' + cols + ' '
						});
					});
				});
			grid.applyLayout(screen);
			screen.render();

			lines = [
					grid.get(0, 0), grid.get(0, 1),
					grid.get(1, 0), grid.get(1, 1),
					grid.get(2, 0), grid.get(2, 1),
					grid.get(3, 0), grid.get(3, 1)
				];

			datas = [
					{x: [], y: []}, {x: [], y: []},
					{x: [], y: []}, {x: [], y: []},
					{x: [], y: []}, {x: [], y: []},
					{x: [], y: []}, {x: [], y: []}
				];

			for (var i = 0; i < datas.length; i++) {
				for (var j = 0; j < 20; j++) {
					datas[i].x.push('0');
					datas[i].y.push(0);
					lines[i].setData('0', 0);
					screen.render();
				}
			}
		}
	} else if (platform === 'android') {
		tiapp.setModule('be.k0suke.tistats', ANDROID_TI_STATS_VER, 'android');
		tiapp.write();

		screen = blessed.screen();
		screen.key(['escape', 'q', 'C-c'], function(ch, key){
			tiapp = tiappXml.load(path.join(data.projectDir, 'tiapp.xml'));
			tiapp.removeModule('be.k0suke.tistats', 'android');
			tiapp.write();

			process.exit(0);
		});

		grid = new contrib.grid({
				rows: 2,
				cols: 2
			});

		_.each([
				['Avail Mem', 'Total Pss'],
				['Total Shared Dirty', 'Total Private Dirty']
			], function(rows, row){
				_.each(rows, function(cols, col){
					grid.set(row, col, contrib.line, {
						style: {
							line: 'yellow',
							text: 'green',
							baseline: 'black'
						},
						xLabelPadding: 10,
						xPadding: 12,
						label: ' ' + cols + ' '
					});
				});
			});
		grid.applyLayout(screen);
		screen.render();

		lines = [
				grid.get(0, 0), grid.get(0, 1),
				grid.get(1, 0), grid.get(1, 1)
			];

		datas = [
				{x: [], y: []}, {x: [], y: []},
				{x: [], y: []}, {x: [], y: []}
			];

		for (var k = 0; k < datas.length; k++) {
			for (var l = 0; l < 20; l++) {
				datas[k].x.push('0');
				datas[k].y.push(0);
				lines[k].setData('0', 0);
				screen.render();
			}
		}
	}

	if (platform === 'ios') {
		var server = net.createServer(function(c){
			var timer = 0;
			c.setEncoding('utf8');

			c.on('data', function(data){
				if (data.split('*')[1] === 'log') {
					timer++;

					var log = data.split('*', 4)[3],
						logs = log.split('/');

					if (logs[0].match(/__TISTATS__$/)) {
						if (!DEBUG) {
							for (var i = 1; i < logs.length; i++) {
								if (datas[i - 1].x.length > 19) {
									datas[i - 1].x.shift();
									datas[i - 1].y.shift();
								}
								datas[i - 1].x.push('' + timer);
								var _data = parseFloat(logs[i], 10);
								switch (i) {
									case 1:
										datas[i - 1].y.push(_data < 0 ? 0 : _data);
										break;
									case 2:
									case 3:
									case 4:
									case 5:
									case 6:
										datas[i - 1].y.push(_data < 0 ? 0 : Math.ceil(_data / 1024 / 1024));
										break;
									case 7:
									case 8:
										datas[i - 1].y.push(_data < 0 ? 0 : Math.ceil(_data));
										break;
								}
								lines[i - 1].setData(datas[i - 1].x, datas[i - 1].y);
								screen.render();
							}
						} else {
							logger.debug(data);
						}
					}
				}
			});

			c.on('end', function(){
				process.exit(0);
			});

			var cmd = +new Date() + '*enable';
			c.write(cmd.length + '*' + cmd);
		}).listen(data.cli.argv['debug-host'].split(':')[1]);
	}

	finished();
}

function finalize(data, finished) {
	if (platform === 'android') {
		var timer = 0;

		var client = net.createConnection({
				port: data.cli.argv['debug-host'].split(':')[1]
			}, function(){
				var request = JSON.stringify({
						seq: +new Date(),
						type: 'request',
						command: 'continue'
					});
				client.write('Content-Length: ' + Buffer.byteLength(request, 'utf8') + '\r\n\r\n' + request);

				request = JSON.stringify({
					seq: +new Date(),
					type: 'request',
					command: 'evaluate',
					arguments: {
						maxStringLength: 10000,
						expression: 'var TiStats = require(\'be.k0suke.tistats\');',
						global: true
					}
				});
				client.write('Content-Length: ' + Buffer.byteLength(request, 'utf8') + '\r\n\r\n' + request);

				setInterval(function(){
					var request = JSON.stringify({
							seq: +new Date(),
							type: 'request',
							command: 'evaluate',
							arguments: {
								maxStringLength: 10000,
								expression: 'TiStats.stats();',
								global: true
							}
						});
					client.write('Content-Length: ' + Buffer.byteLength(request, 'utf8') + '\r\n\r\n' + request);
				}, 1000);
			});
		client.setEncoding('utf8');

		client.on('data', function(data){
			if (!DEBUG) {
				var response = data.split('\r\n\r\n');
				try {
					var json = JSON.parse(response[1]);

					if (json.success && json.body.value) {
						timer++;

						var _json = JSON.parse(json.body.value);

						var logs = [
								_json.memoryInfo.availMem,
								_json.processMemoryInfo.totalPss,
								_json.processMemoryInfo.totalSharedDirty,
								_json.processMemoryInfo.totalPrivateDirty
							];
						for (var i = 0; i < logs.length; i++) {
							if (datas[i].x.length > 19) {
								datas[i].x.shift();
								datas[i].y.shift();
							}
							datas[i].x.push('' + timer);
							var _data = parseFloat(logs[i], 10);
							datas[i].y.push(_data < 0 ? 0 : _data);
							lines[i].setData(datas[i].x, datas[i].y);
							screen.render();
						}
					}
				} catch(e) {}
			} else {
				logger.debug(data);
			}
		});

		client.on('end', function(){
			process.exit(0);
		});
	}

	finished();
}