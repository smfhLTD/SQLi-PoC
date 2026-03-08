
let mysql = require('mysql');
let http = require('node:http');
let url = require('node:url');

var server = http.createServer((request, response) => 
{
		if(request.method == "GET") {response.writeHead(200, {"Content-Type": "application/json"}); }
		else {response.end('HTTP/1.1 400 Bad Request \r\n\r\n')};
		var dbConnection = null;
		var searchParam = null;
		var clientQuery = null;

		clientQuery = request.url.slice(8); 
		console.log("Received query: " + clientQuery);
		dbConnection = mysql.createConnection({
			user:'temp',
			password: 'secret',
			database: 'sqli_data'
		});
		query = `SELECT id,user,password FROM users WHERE user='${clientQuery}';`;
		dbConnection.query(query, function(err, results, fields) 
		{
			if(err) { response.end(`HTTP/1.1 400 Bad Request \n${err}\r\n\r\n`); };
			console.log(results);
			response.end(JSON.stringify(results)); 
		});
		dbConnection.end();
});
server.on('clientError', (err, socket) => 
{
	socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}); 

server.listen(8000);
if(server.listening) { console.log("listening..."); }
