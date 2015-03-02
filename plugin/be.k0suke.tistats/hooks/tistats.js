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

var TI_STATS_ZIP = 'be.k0suke.tistats-iphone-1.0.1.zip',
	TI_STATS_VER = '1.0.1';

var logger;

exports.cliVersion = '>=3.2';
exports.init = function(_logger, config, cli, appc){
	logger = _logger;

	if (process.argv.indexOf('ios') !== -1 &&
		process.argv.indexOf('--tistats') !== -1) {
		// force quiet
		if (!DEBUG) {
			config.cli.quiet = true;
		}

		if (!fs.existsSync(path.join(appc.environ.installPath, 'modules', 'iphone', 'be.k0suke.tistats', TI_STATS_VER))) {
			var zip = admzip(path.join(__dirname, 'be.k0suke.tistats-iphone-1.0.1.zip')),
				entries = zip.getEntries();
			_.each(entries, function(entry){
				fs.outputFileSync(path.join(appc.environ.installPath, entry.entryName), entry.getData());
			});
		}

		if (!DEBUG) {
		}

		cli.addHook('build.pre.construct', construct);
	}
};

function construct(data, finished) {
	data.cli.argv.$_.push('--debug-host', data.cli.argv.tistats);
	data.cli.argv['debug-host'] = data.cli.argv.tistats;
	data.cli.globalContext.argv['debug-host'] = data.cli.argv.tistats;
	data.cli.command.argv['debug-host'] = data.cli.argv.tistats;

	var tiapp = tiappXml.load(path.join(data.projectDir, 'tiapp.xml'));
	tiapp.setModule('be.k0suke.tistats', '1.0.1', 'iphone');
	tiapp.write();

	var screen, grid, lines, datas;

	if (!DEBUG) {
		screen = blessed.screen();
		screen.key(['escape', 'q', 'C-c'], function(ch, key){
			var tiapp = tiappXml.load(path.join(data.projectDir, 'tiapp.xml'));
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

		c.on('end', function(e){
			process.exit(0);
		});

		var cmd = +new Date() + '*enable';
		c.write(cmd.length + '*' + cmd);
	}).listen(data.cli.argv.tistats.split(':')[1]);

	finished();
}