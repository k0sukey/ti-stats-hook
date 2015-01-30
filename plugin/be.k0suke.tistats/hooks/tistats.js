var _ = require('lodash'),
	blessed = require('blessed'),
	contrib = require('blessed-contrib'),
	exec = require('child_process').exec,
	net = require('net'),
	path = require('path');

exports.cliVersion = '>=3.2';
exports.init = function(logger, config, cli, appc){
	if (process.argv.indexOf('ios') !== -1 &&
		process.argv.indexOf('--tistats') !== -1) {
		// force quiet
		config.cli.quiet = true;

		var screen = blessed.screen(),
			grid = new contrib.grid({
				rows: 4,
				cols: 2
			}),
			datas = [
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []},
				{x: [], y: []}
			];

		for (var i = 0; i < datas.length; i++) {
			for (var j = 0; j < 20; j++) {
				datas[i].x.push('0');
				datas[i].y.push(0);
			}
		}

		grid.set(0, 0, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Views in App '
		});
		grid.set(0, 1, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Free Memory [MB] '
		});
		grid.set(1, 0, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Resident Size / msec [MB] '
		});
		grid.set(1, 1, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Resident Size [MB] '
		});
		grid.set(2, 0, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Virtual Size / msec [MB] '
		});
		grid.set(2, 1, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' Virtual Size [MB] '
		});
		grid.set(3, 0, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' User Time [msec] '
		});
		grid.set(3, 1, contrib.line, {
			style: {
				line: "yellow",
				text: "green",
				baseline: "black"
			},
			xLabelPadding: 10,
			xPadding: 12,
			label: ' System Time [msec] '
		});

		grid.applyLayout(screen);
		var lines = [
			grid.get(0, 0),
			grid.get(0, 1),
			grid.get(1, 0),
			grid.get(1, 1),
			grid.get(2, 0),
			grid.get(2, 1),
			grid.get(3, 0),
			grid.get(3, 1)
		];

		screen.key(['escape', 'q', 'C-c'], function(ch, key){
			return process.exit(0);
		});
		screen.render();

		cli.addHook('build.pre.construct', function(data, finished){
			data.cli.argv.$_.push('--debug-host', data.cli.argv.tistats);
			data.cli.argv['debug-host'] = data.cli.argv.tistats;
			data.cli.globalContext.argv['debug-host'] = data.cli.argv.tistats;
			data.cli.command.argv['debug-host'] = data.cli.argv.tistats;

			var server = net.createServer(function(c){
				var timer = 0;
				c.setEncoding('utf8');

				c.on('connect', function(){
					console.log('connected');
				});

				c.on('data', function(data){
					if (data.split('*')[1] === 'log') {
						timer++;

						var log = data.split('*', 4)[3],
							logs = log.split('#');

						if (logs[0].match(/__TISTATS__$/)) {
							for (var i = 1; i < logs.length; i++) {
								if (datas[i - 1].x.length > 19) {
									datas[i - 1].x.shift();
									datas[i - 1].y.shift();
								}
								datas[i - 1].x.push('' + timer);
								switch (i) {
									case 1:
										datas[i - 1].y.push(parseInt(logs[i], 10));
										break;
									case 2:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10) / 1024 / 1024));
										break;
									case 3:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10) / 1024 / 1024));
										break;
									case 4:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10) / 1024 / 1024));
										break;
									case 5:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10) / 1024 / 1024));
										break;
									case 6:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10) / 1024 / 1024));
										break;
									case 7:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10)));
										break;
									case 8:
										datas[i - 1].y.push(Math.ceil(parseFloat(logs[i], 10)));
										break;
								}
								lines[i - 1].setData(datas[i - 1].x, datas[i - 1].y);
								screen.render();
							}
						}
					}
				});

				c.on('end', function(e){
					console.log('ended');
				});

				var cmd = +new Date() + '*enable';
				c.write(cmd.length + '*' + cmd);
			}).listen(data.cli.argv.tistats.split(':')[1]);

			finished();
		});
		cli.addHook('build.pre.compile', function(data, finished){
			finished();
		});
		cli.addHook('build.ios.copyResource', function(data, finished){
			finished();
		});
		cli.addHook('build.ios.xcodebuild', function(data, finished){
			finished();
		});
		cli.addHook('build.ios.writeBuildManifest', function(data, finished){
			finished();
		});
		cli.addHook('build.post.compile', function(data, finished){
			finished();
		});
		cli.addHook('build.finalize', function(data, finished){
			finished();
		});
	}
};