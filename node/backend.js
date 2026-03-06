// Create & Listen HTTP server
// HTTP server takes input from an input field on index.html, passes to Node, which passes to mysql
// Node returns data on index.html according to output returned from mysql.

// Might as well take apache out of the equation and just run everything on the node... Could be an easier and more efficient solution.
//A node.js driver is an interface for connecting the node.js process with other data sources, like other apps and DBMS'.
let mysql = require('mysql');
let http = require('node:http');
let url = require('node:url');

// server.listening = bool value check if server running and log

//response.end([data[, encoding]][, callback])
	// If data is specified, it is similar in effect to calling response.write(data, encoding) followed by response.end(callback)

// could use response.write(chunk[, encoding][, callback]) to conveniently write the mysql data to the body of my response

//response.writeHead(statusCode[, statusMessage][, headers])
	// could be useful for implementing CORS/CSP/Cookies further down the line.

// in message.headers, under http.IncomingMessage class: Duplicates of age, authorization, content-length, content-type, etag, expires, from, host, if-modified-since, if-unmodified-since, last-modified, location, max-forwards, proxy-authorization, referer, retry-after, server, or user-agent are discarded. To allow duplicate values of the headers listed above to be joined, use the option joinDuplicateHeaders in http.request() and http.createServer().
	// Could this be used for a sort of Header Pollution? Could be useful later...

//typeof(request) === http.IncomingMessage 
var server = http.createServer((request, response) => 
{
		if(request.method == "GET") {response.writeHead(200, {"Content-Type": "application/json"}); }
		else {response.end('HTTP/1.1 400 Bad Request \r\n\r\n')};
		var dbConnection = null;
		var searchParam = null;
		var clientQuery = null;
		// In MYSQL: CREATE DATABASE sqli_data; CREATE USER 'temp' IDENTIFIED BY 'passwd'; GRANT 'temp' 'R/W sqli_data'
		// http.incomingmessage: message.url
		// take the clientQuery from the URL parameters
		clientQuery = request.url.slice(8); 
		console.log("Received query: " + clientQuery);
		dbConnection = mysql.createConnection({
			user:'temp',
			password: 'secret',
			database: 'sqli_data'
		});
		query = `SELECT id,user,password FROM users WHERE id=${clientQuery};`; //id=1 AND UNION SELECT NULL,NULL,CURRENT_ROLE() FROM users
		dbConnection.query(query, function(err, results, fields) 
		{
			if(err) { response.end(`HTTP/1.1 400 Bad Request \n${err}\r\n\r\n`); };
			console.log(results);
			response.end(JSON.stringify(results)); // return the results to apache
		});
		dbConnection.end();
});
server.on('clientError', (err, socket) => 
{
	socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}); // the ".on('EVENT', [CALLBACK]) is how we handle events in NodeJS!

server.listen(8000);
if(server.listening) { console.log("listening..."); }