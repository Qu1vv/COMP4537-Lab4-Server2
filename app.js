const http = require("http");
const url = require("url");
const msg = require('./lang/en/user');

class Server{
    constructor(){
        this.dictionary = {};
        this.totalRequests = 0;
    }
    start() {

        http.createServer((req, res) => {
            this.totalRequests++;  // Track total requests
            this.handleRequest(req, res);
        }).listen(8080);    
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        let path = parsedUrl.pathname;
        const method = req.method;

        if (path === "/") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            path = path.slice(0, -1);
            res.end("Health check OK");
            return;
        }
 
        // console.log(path);

       // res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");  
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (method === "OPTIONS") {
            res.writeHead(204); // No content
            res.end();
            return;
        }

        if (method === "GET" && path === "/api/definitions") {
            this.getDefinition(parsedUrl.query.word, res);
        } else if (method === "POST" && path === "/api/definitions") {
            this.processRequestBody(req, res, (data) => this.addDefinition(data, res));
        } else if (method === "OPTIONS") {
            res.writeHead(204); // no content to display
            res.end();
            return;
        } else {
            this.sendResponse(res, 404, { error: msg.routeNotFoundError });
        }
    }

    getDefinition(word, res) {
        // console.log("get definition, GET");
        if (!word || typeof word !== "string") {
            return this.sendResponse(res, 400, { error: msg.invalidResponseError });
        }

        if (this.dictionary[word]) {
            return this.sendResponse(res, 200, {
                requestNumber: this.totalRequests,
                word: word,
                definition: this.dictionary[word]
            });
        } else {
            return this.sendResponse(res, 404, {
                requestNumber: this.totalRequests,
                message: msg.wordNotFoundError
                // message: `Word '${word}' not found!`
            });
        }
    }

    addDefinition(data, res) {
        const word = data.word?.trim();
        const definition = data.definition?.trim();

        if (!word || !definition) {
            return this.sendResponse(res, 400, { error: msg.invalidInputError});
        }

        if (this.dictionary[word]) {
            return this.sendResponse(res, 409, {
                requestNumber: this.totalRequests,
                message: msg.wordExistsWarning
                // message: `Warning! '${word}' already exists.`
            });
        }

        this.dictionary[word] = definition;
        return this.sendResponse(res, 201, {
            requestNumber: this.totalRequests,
            totalEntries: Object.keys(this.dictionary).length,
            message: msg.newEntryEntered
            // message: `New entry recorded: "${word} : ${definition}"`
        });
    }

    processRequestBody(req, res, callback) {
        // console.log("process request body, post");
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                callback(data);
            } catch (error) {
                this.sendResponse(res, 400, { error: msg.invalidJSONError });
            }
        });
    }

    sendResponse(res, statusCode, data) {
        res.writeHead(statusCode);
        res.end(JSON.stringify(data));
    }
}
const server = new Server();
server.start();