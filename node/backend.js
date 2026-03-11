// Create & Listen HTTP server
// HTTP server takes input from an input field on index.html, passes to Node, which passes to mysql
// Node returns data on index.html according to output returned from mysql.
/*************TASKS**********/
/*
// Might as well take apache out of the equation and just run everything on the node... Could be an easier and more efficient solution.
* GET DONE
* POST SQLi DONE
* Blind SQLi DONE
* Header Based injections (see: http.request.headers)
* Cookie Based injections
* Mulitipart Form data injections
* JSON based injections
* SOAP/XML based injections
*/

//A node.js driver is an interface for connecting the node.js process with other data sources, like other apps and DBMS'.
let mysql = require('mysql');
let http = require('node:http');

//response.end([data[, encoding]][, callback])
	// If data is specified, it is similar in effect to calling response.write(data, encoding) followed by response.end(callback)

//response.writeHead(statusCode[, statusMessage][, headers])
	// could be useful for implementing CORS/CSP/Cookies further down the line.

// in message.headers, under http.IncomingMessage class: Duplicates of age, authorization, content-length, content-type, etag, expires, from, host, if-modified-since, if-unmodified-since, last-modified, location, max-forwards, proxy-authorization, referer, retry-after, server, or user-agent are discarded. To allow duplicate values of the headers listed above to be joined, use the option joinDuplicateHeaders in http.request() and http.createServer().
	// Could this be used for a sort of Header Pollution? Could be useful later...

//typeof(request) === http.IncomingMessage 
function queryDatabase()
{
	var dbConnection = null; 

	dbConnection = mysql.createConnection({
		user:'temp',
		password: 'secret',
		database: 'sqli_data'
	});
	

	//can't yet perform both the querying and dbConnection creation in same func, can't fish db results out of dbConn.query()'s scope... Has to be a better workaround. 
	// can use response.write() here to append the results, then .end() after returning. response object should be modified if node/JS passes 
		// function parameters by REFERENCE, rather than by VALUE
	return dbConnection;
}
var server = http.createServer((request, response) => 
{

		var clientQuery;
		var query;
		var headerQuery;
		var dbConnection;
		var dbData;
		var userAgent;
		
		/* {
			host: '127.0.0.1:8000',
			'user-agent': '{VARIABLE LENGTH}',
			...
		*/
		// SELECT IF(STRCMP(CURRENT_USER(),'temp@%') = 0, 'YES', 'NO');
		// SELECT IF(STRCMP(CURRENT_USER(),"temp@%") = 0, "YES", "NO + `');
		// HEADER LOGGING INJECTION
			//assuming user-agent is always the 2nd header...
		userAgent = Object.values(request.headers)[1];
		console.log("inserting user agent into db: " + userAgent);
		dbConnection = queryDatabase();
		// INSERT INTO user_agents VALUES('mozilla'); SELECT IF(2>1, SLEEP(2), 'no`');`
		headerQuery = `INSERT INTO user_agents VALUES('${userAgent}');`
		dbConnection.query(headerQuery, function(err, results, fields)
		{
			if(err) {console.log("ERROR logging user-agent: " + err)}

		});


		if(request.method == "GET")
		{
			response.writeHead(200, {"Content-Type": "application/json"}); 
			clientQuery = request.url.slice(8); 
			console.log("Received query: " + clientQuery);
			//if((dbData = queryDatabase(clientQuery)) != null) {response.end(JSON.stringify(dbData));} FOR AFTER FIXING dbConn.query() SCOPE ISSUE
			dbData = queryDatabase();
				query = `SELECT id,user,password FROM users WHERE user='${clientQuery}';`;
				dbConnection = queryDatabase();
				dbConnection.query(query, function(err, results, fields) 
				{	
					if(err) { response.end('HTTP/1.1 400 Bad Request \r\n\r\n');};
					dbConnection.end();
					response.end(JSON.stringify(results));
				});
		}

		else if (request.method == "POST" ) 
		{
			request.setEncoding("utf8");
			request.on("data", (data) => {
				if(data === null) {response.end('HTTP/1.1 400 Bad Request \r\n\r\n');}
				dbData = queryDatabase(data);
					query = `SELECT id,user,password FROM users WHERE user='${data}';`;
					dbConnection = queryDatabase();
					dbConnection.query(query, function(err, results, fields) 
					{	
						if(err) { response.end('HTTP/1.1 400 Bad Request \r\n\r\n');};
						dbConnection.end();
						response.end(JSON.stringify(results));
					});
			});
		}

		else {console.log('Invalid METHOD'); response.end('HTTP/1.1 400 Bad Request \r\n\r\n')};

});
server.on('clientError', (err, socket) => 
{
	socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}); // the ".on('EVENT', [CALLBACK]) is how we handle events in NodeJS!

server.listen(8000);
if(server.listening) { console.log("listening..."); }
