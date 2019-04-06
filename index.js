const http = require('http');

const PORT = 8080;

http.createServer(handleRequests).listen(PORT);
console.log(`Server listening on port ${PORT}`);

function handleRequests (request, response) {
    response.write('Hello World!');
    response.end();
}
