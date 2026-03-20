// Create & Listen HTTP server
// HTTP server takes input from an input field on index.html, passes to Node, which passes to mysql
// Node returns data on index.html according to output returned from mysql.
/*************TASKS**********/
/*
// Might as well take apache out of the equation and just run everything on the node... Could be an easier and more efficient solution.
// Include payload file for ideas that didn't make it here, but could in other cases.
* GET DONE
* POST SQLi DONE
* Blind SQLi DONE
* Header Based injections (see: http.request.headers) DONE

* Cookie Based injections WIP

* Mulitipart Form data injections
* JSON based injections
* SOAP/XML based injections
*/

//A node.js driver is an interface for connecting the node.js process with other data sources, like other apps and DBMS'.
let mysql = require('mysql');
let http = require('node:http');
let { createHash } = require('node:crypto');
let randomstring = require('randomstring');

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


async function getCookie(cookieId, response)
{
	// Compare the unix epochs values to check expiration and existence

	var dbConnection = queryDatabase();
	console.log("Checking cookie validitiy for ID: " + cookieId);
	query = `SELECT * FROM cookies WHERE id='${cookieId}' AND expiration > (SELECT UNIX_TIMESTAMP());`

	let queryPromise = await new Promise(function(resolve, reject) 
	{ 
		dbConnection.query(query, function(err, results) 
		{	
			if(err) {reject(err);}
			resolve(results);
		})
	});

	queryPromise.then(function(results) 
	{ 
		if(Object.keys(results).length != 0) //WORKS
		{
			console.log("Cookie attached is valid!");
		}
		else
		{
			console.warn("COOKIE INVALID, REMOVING COOKIE " + cookieId + " FROM DB.");
			dbConnection.query(`DELETE FROM cookies WHERE id='${cookieId}';`, function(error, result)
			{
				if(error) {console.log("ERROR Deleting cookie from DB: " + error);}
			});
			//current issue is in this functionality - /setCookie is trying to set headers AFTER the response is already sent. Need to implement promises here properly. 
			// Currently only works if the cookie is valid.
			setCookie(response);
		}

	},
	function(err) {console.log("ERROR LOOKING FOR COOKIE IN DB!");}
	);
}

function setCookie(serverResponse)
{
	return new Promise(function(resolve, reject)
	{
		var md5 = createHash('md5');
		console.log("current epoch: " + (Date.now() / 1000));
		var expiration = (Date.now() / 1000) + 300;
		var dbConnection = queryDatabase();
		var digest = (md5.update(randomstring.generate(32))).digest('hex');
		console.log("DIGEST: " + digest);
		var query = `INSERT INTO cookies VALUES('${digest}', '${expiration}');`
		dbConnection.query(query, function(err, results)
		{
			//inside cookie insert query
			debugger;
		});
	});
}

//how to several args?
function cookieStuff(request, response)
{
	if (request.headers.cookie)
	{
		console.log("cookie is attched... checking validity.");
		getCookie(request.headers.cookie.substring(10), response); 
	}
	else
	{
		debugger;
		console.log("COOKIE NOT ATTACHED, GENERATING");
		setCookie(response).then(function(digest, results)
		{
			debugger;
			console.log('SUCCESS in COOKIE INSERTION');
			try { 
				debugger;
				var cookie = `Set-Cookie: sessionId=${digest}`; 
				response.writeHead(cookie, "utf8");
				response.end(); }
			catch(err) {console.log("ERROR in Set-Cookie:" + err );}
		},
		function(err) {console.error("ERROR in COOKIE GENERATION: " + err);});
	}
}
function setCookie(response)
{	
	var md5 = createHash('md5');
	console.log("current epoch: " + (Date.now() / 1000));
	var expiration = (Date.now() / 1000) + 300;
	var dbConnection = queryDatabase();
	var digest = (md5.update(randomstring.generate(32))).digest('hex');
	console.log("DIGEST: " + digest);
	var query = `INSERT INTO cookies VALUES('${digest}', '${expiration}');`
	dbConnection.query(query, function(err, results)
	{
		//inside cookie insert query
		debugger;

		var cookie = `Set-Cookie: sessionId=${digest}`; 
		response.write(cookie, "utf8");
		response.end();
	});
}

function postData(request, response)
{
		// ENTERED postDATA
		debugger;
		console.log("ASSUMING RECEIVED POST DATA");
		request.setEncoding("utf8");
		request.on("data", (data) => {
			if(data === null) {response.end('HTTP/1.1 400 Bad Request \r\n\r\n');}

			query = `SELECT id,user,password FROM users WHERE user='${data}';`;
			dbConnection = queryDatabase();
			dbConnection.query(query, function(err, results) 
			{	
				if(err) { response.end('HTTP/1.1 400 Bad Request \r\n\r\n');};
				//before response.end in POST
				debugger;
				response.write(JSON.stringify(results));
			});
		});
}


function executeFunctionWithArgs(operation, callback) {
  // executes function
  const {args, args2, func} = operation;
  func(args, args2, callback);
  debugger;
}

function serialProcedure(operation) 
{
  debugger;
  if (!operation) 
  {
    process.exit(0);
     // finished
  }
  executeFunctionWithArgs(operation, function (result) 
  {
      // continue AFTER callback
      serialProcedure(operations.shift());
  });
}

var server = http.createServer(function(request, response) 
{
	//check if response.writeHead() works from within the functions, as JS passes copy-references and all that... 
	// --- make sure modifying the response object modifies it in createServer() as well. IT SHOULD
	operations = [{ func: setCookie, args: response }, {func: postData, args: request, args2: response}]; //the funcs here needs to query the database asynchronously as well - might fuck up the in-series flow	

	// run current function in the queue
	serialProcedure(operations.shift());


		var clientQuery;
		var query;
		var headerQuery;
		var dbConnection;
		var dbData;
		var userAgent;


		// HEADER LOGGING INJECTION
			//WIP Playing with a better parsing method here to extract the user-agent string instead of relying on its index
		/* userAgent = request.headers.user_agent.substring(10);
		console.log("inserting user agent into db: " + userAgent);
		dbConnection = queryDatabase();

		// PoC payload: INSERT INTO user_agents VALUES('{mozilla') UNION SELECT SLEEP('5}
		// Perhaps due to AJAX? but they're sequential...
				// Here, the injection is 100% blind, as the attacker has no indication whether or not the payload was syntactically correct/not
		headerQuery = `INSERT INTO user_agents VALUES('${userAgent}');`
		dbConnection.query(headerQuery, function(err, results, fields)
		{
			if(err) {console.log("ERROR logging user-agent: " + err)}

		});
		*/
		if(request.method == "GET")
		{
			response.writeHead(200, {"Content-Type": "application/json"}); 
			clientQuery = request.url.slice(8); 
			console.log("Received query: " + clientQuery);
			//if((dbData = queryDatabase(clientQuery)) != null) {response.end(JSON.stringify(dbData));} FOR AFTER FIXING dbConn.query() SCOPE ISSUE
			//dbData = queryDatabase();
				query = `SELECT id,user,password FROM users WHERE user='${clientQuery}';`;
				dbConnection = queryDatabase();
				dbConnection.query(query, function(err, results) 
				{	
					if(err) { response.end('HTTP/1.1 400 Bad Request \r\n\r\n');};
					dbConnection.end();
					response.write(JSON.stringify(results));
				});
		}
/*		else if (request.method == "POST" ) 
		{
			console.log("RECEIVED POST DATA");
			request.setEncoding("utf8");
			request.on("data", (data) => {
				if(data === null) {response.end('HTTP/1.1 400 Bad Request \r\n\r\n');}

				query = `SELECT id,user,password FROM users WHERE user='${data}';`;
				dbConnection = queryDatabase();
				dbConnection.query(query, function(err, results) 
				{	
					if(err) { response.end('HTTP/1.1 400 Bad Request \r\n\r\n');};
					//before response.end in POST
					debugger;
					response.write(JSON.stringify(results));
				});
			});
		}
		else {console.log('Invalid METHOD'); response.end('HTTP/1.1 400 Bad Request \r\n\r\n')};
*/

});
server.on('clientError', (err, socket) => 
{
	socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}); // the ".on('EVENT', [CALLBACK]) is how we handle events in NodeJS!

server.listen(8000);
if(server.listening) { console.log("listening..."); }
