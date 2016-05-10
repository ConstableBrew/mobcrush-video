var port = process.env.PORT || 3000;
var http = require('http');
var https = require('https');
// var httpProxy = require('http-proxy');
var url  = require('url');

// var proxy = httpProxy.createProxyServer({});
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static')('./');

var server = http.createServer(function(req, res) {
	console.log(req.url);

	var done = finalhandler(req, res);
	var reqUrl = url.parse(req.url);
	var controller = reqUrl.pathname.match(/\/?[a-z]*/i);
	if (controller && controller.length)
		controller = controller[0];
	var options = null;
	console.log(controller);
	switch (controller) {
		case '/api':
			options = url.parse('https://www.mobcrush.com' + req.url);
		case '/static':
			if (!options) options = url.parse('https://cdn.mobcrush.com' + req.url);

			req.pause();

			
			options.headers = req.headers;
			options.method = req.method;
			options.agent = false;

			options.headers['host'] = options.host;

			var connector = (options.protocol == 'https:' ? https : http).request(options, function(serverResponse) {
				console.log('<== Received res for', serverResponse.statusCode, reqUrl);
				console.log('\t-> Request Headers: ', options);
				console.log(' ');
				console.log('\t-> Response Headers: ', serverResponse.headers);

				serverResponse.pause();

				serverResponse.headers['access-control-allow-origin'] = '*';

				switch (serverResponse.statusCode) {
					// pass through.  we're not too smart here...
					case 200: case 201: case 202: case 203: case 204: case 205: case 206:
					case 304:
					case 400: case 401: case 402: case 403: case 404: case 405:
					case 406: case 407: case 408: case 409: case 410: case 411:
					case 412: case 413: case 414: case 415: case 416: case 417: case 418:
						res.writeHeader(serverResponse.statusCode, serverResponse.headers);
						serverResponse.pipe(res, {end:true});
						serverResponse.resume();
						break;

					// fix host and pass through.  
					case 301:
					case 302:
					case 303:
						serverResponse.statusCode = 303;
						serverResponse.headers['location'] = 'http://localhost:'+PORT+'/'+serverResponse.headers['location'];
						console.log('\t-> Redirecting to ', serverResponse.headers['location']);
						res.writeHeader(serverResponse.statusCode, serverResponse.headers);
						serverResponse.pipe(res, {end:true});
						serverResponse.resume();
						break;

					// error everything else
					default:
						var stringifiedHeaders = JSON.stringify(serverResponse.headers, null, 4);
						serverResponse.resume();
						res.writeHeader(500, {
						'content-type': 'text/plain'
						});
						res.end(process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders);
						break;
				}

				console.log('\n\n');
			});
			req.pipe(connector, {end:true});
			req.resume();

			break;
		default:
			console.log('serveStatic');
			serveStatic(req, res, done);
	}
})
.listen(port);

// proxy.listen(8005);

// //
// // Listen for the `error` event on `proxy`.
// proxy.on('error', function (err, req, res) {
//   res.writeHead(500, {
//     'Content-Type': 'text/plain'
//   });

//   res.end('Something went wrong. And we are reporting a custom error message.');
// });

// //
// // Listen for the `proxyRes` event on `proxy`.
// //
// proxy.on('proxyRes', function (proxyRes, req, res) {
//   console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
// });

// //
// // Listen for the `open` event on `proxy`.
// //
// proxy.on('open', function (proxySocket) {
//   // listen for messages coming FROM the target here
//   proxySocket.on('data', hybiParseAndLogMessage);
// });

// //
// // Listen for the `close` event on `proxy`.
// //
// proxy.on('close', function (res, socket, head) {
//   // view disconnected websocket connections
//   console.log('Client disconnected');
// });

console.log('listening on port', port);
