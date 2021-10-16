const http = require("http");
const url = require("url");

const PORT = 4000;

let store = {};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === "/set") {
    for (const key in parsedUrl.query) {
      store[key] = parsedUrl.query[key];
    }
    console.log(store);
    res.end("Data stored.");
  }
  if (parsedUrl.pathname === "/get") {
    let payload = {};

    if (Array.isArray(parsedUrl.query["key"])) {
      for (const datakey of parsedUrl.query["key"]) {
        payload[datakey] = store[datakey];
      }
    } else {
      payload[parsedUrl.query["key"]] = store[parsedUrl.query["key"]];
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  }
});

server.listen(PORT, () =>
  console.log(`Server has started, listening on port ${PORT}`)
);
