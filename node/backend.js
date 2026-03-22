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
let http = require('node:http');
let { createHash } = require('node:crypto');
let randomstring = require('randomstring');
const mysql = require('mysql2/promise');

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
	var dbConnection = await queryDatabase();
	console.log("Checking cookie validitiy for ID: " + cookieId);
	query = `SELECT * FROM cookies WHERE id='${cookieId}' AND expiration > (SELECT UNIX_TIMESTAMP());`

	try 
	{
		const results = await dbConnection.query(query);	
		if(Object.keys(results).length != 0) 
		{
			console.log("Cookie attached is valid!");
			return true;
		}
		else
		{
			console.log("COOKIE INVALID, REMOVING COOKIE " + cookieId + " FROM DB.");
			try 
			{ 
				await dbConnection.query(`DELETE FROM cookies WHERE id='${cookieId}';`);
			}
			catch(error)
			{	
				console.log("ERROR Deleting cookie from DB: " + error);
				setCookie(response);
			}
		}
	}
	catch(err)
	{
		console.log("ERROR LOOKING FOR COOKIE IN DB: " + err);
	}
}

async function genCookie(serverResponse)
{

		var md5 = createHash('md5');
		console.log("current epoch: " + (Date.now() / 1000));
		var expiration = (Date.now() / 1000) + 300;
		var dbConnection = await queryDatabase();
		var digest = (md5.update(randomstring.generate(32))).digest('hex');
		console.log("DIGEST: " + digest);
		var query = `INSERT INTO cookies VALUES('${digest}', '${expiration}');`
		debugger;
		dbConnection = await mysql.createConnection({
			user:'temp',
			password: 'secret',
			database: 'sqli_data'
		});
		try
		{
			const results = await dbConnection.query(query);
			await dbConnection.end();
			return digest;
		}
		catch(err) 
		{
			await dbConnection.end();
			console.log("ERROR in COOKIE INSERTION: " + err); 
			return null;
		} 		
}

async function queryPOST(data)
{
	dbConnection = await queryDatabase();
	query = `SELECT id,user,password FROM users WHERE user='${data}';`;
	try 
	{
		const results = await dbConnection.query(query);
		return results;
	}
	catch(err)
	{
		console.log("ERROR in queryPOST: " + err);
	}
}

async function queryGET(clientQuery)
{
	query = `SELECT id,user,password FROM users WHERE user='${clientQuery}';`;
	try 
	{
		dbConnection = await queryDatabase();
		var getData = dbConnection.query(query); 
		console.log("Returning results from getData()");
		return results;
	}
	catch(err)
	{
		console.log("ERROR in GETDATA: " + err);
		dbConnection.end();
		return null;
	}
}

var server = http.createServer(function(request, response) 
{

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
		dbConnection = await queryDatabase();

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
			//When I have the time, I should properly organise the 200/400 code paths
			response.writeHead(200, {"Content-Type": "application/json"}); 
			clientQuery = request.url.slice(8);
			console.log("Received query: " + clientQuery);

			const results = queryGET(clientQuery)
			results.then(function(results)
			{
				response.write(JSON.stringify(results));
				if(results == null) {console.log("NO DATA RETURNED FROM getData()");}
			});
			response.end('HTTP/1.1 400 Bad Request \r\n\r\n');
		}
		else if (request.method == "POST" ) 
		{
			console.log("RECEIVED POST DATA");
			request.setEncoding("utf8");
			request.on("data", (data) => {
				if(data === null) { console.log("NULL data in POST"); response.end('HTTP/1.1 400 Bad Request \r\n\r\n');}
				try
				{
					const results = queryPOST(data);
					results.then(function(returnedData)
					{
						response.write(JSON.stringify(returnedData));
					});
				}
				catch(err)
				{	
					console.log("ERROR in POST QUERY: " + err);
					response.end('HTTP/1.1 400 Bad Request \r\n\r\n');
				}	
			});
		}
		else {console.log('Invalid METHOD'); response.end('HTTP/1.1 400 Bad Request \r\n\r\n')};
		
		//COOKIE VALIDATION INJECTION
		if (request.headers.cookie)
		{
			console.log("cookie is attched... checking validity.");
			getCookie(request.headers.cookie.substring(10), response); 
		}
		else
		{
			console.log("COOKIE NOT ATTACHED, GENERATING");
			const cookie = genCookie(response);
			if(cookie == null) 
			{
				console.error("ERROR in COOKIE GENERATION: " + err);
			}
			try 
			{ 
				debugger;
				cookie.then(function(data)
				{
					var cookie_header = `Set-Cookie: sessionId=${data}`; 
					response.write(data, "utf8");
					response.end(); 
				});
			}
			catch(err) 
			{
				console.log("ERROR in Set-Cookie:" + err );
			}
		}
});
server.on('clientError', (err, socket) => 
{
	console.log("ERROR in CLIENT: " + err);
	socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
}); // the ".on('EVENT', [CALLBACK]) is how we handle events in NodeJS!

server.listen(8000);
if(server.listening) { console.log("listening..."); }
