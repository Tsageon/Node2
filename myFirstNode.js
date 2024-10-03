const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('node:url');

const hostname = '127.0.0.1';
const port = 3001;

const dataDir = path.join(__dirname, 'manager');  
const filePath = path.join(dataDir, 'shopping-list.json');

let lastId = 0; 

const getLastIdFromData = (data) => {
  if (data.length === 0) return 0;
  return Math.max(...data.map(item => item.id));
};

const initJSONFile = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log("Directory created successfully because it was not present");
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
    console.log("Shopping list file created successfully");
    lastId = 0; 
  } else {
    const data = readJSONFile();
    lastId = getLastIdFromData(data); 
    console.log("Last ID initialized to", lastId);
  }
};

const readJSONFile = () => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

const writeJSONFile = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("File written successfully");
};

initJSONFile();

const server = createServer((req, res) => {
  const { method, url } = req;
  const { pathname } = parse(url, true);
  
  console.log(`Received request: ${method} ${url}`);

  if (pathname === '/shopping-list') {
    switch (method) {
      case 'GET':
        handleGet(req, res);
        break;
      case 'POST':
        handlePost(req, res);
        break;
      case 'PUT':
      case 'PATCH':
        handlePutPatch(req, res);
        break;
      case 'DELETE':
        handleDelete(req, res);
        break;
      default:
        res.statusCode = 405; 
        res.end(`Method ${method} not allowed.`);
        break;
    }
  } else {
    res.statusCode = 404;
    res.end('Does not exist');
  }
});

const handleGet = (req, res) => {
  console.log("Handling GET request");
  const data = readJSONFile();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const handlePost = (req, res) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const newItem = JSON.parse(body);
    if (!newItem.name || !newItem.quantity) {
      res.statusCode = 400;
      res.end('Item must have name and quantity.');
      return;
    }

    const data = readJSONFile();
    lastId += 1;
    newItem.id = lastId; 
    data.push(newItem);
    writeJSONFile(data);

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(newItem));
  });
};

const handlePutPatch = (req, res) => {
  console.log("Handling PUT/PATCH request");
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const updatedItem = JSON.parse(body);
    console.log("Item to update:", updatedItem);

    const data = readJSONFile();
    const index = data.findIndex(item => item.id === updatedItem.id); 

    if (index === -1) {
      console.log("Item not found with ID:", updatedItem.id);
      res.statusCode = 404; 
      res.end('Item not found.');
      return;
    }
    
    console.log("Item to update:", updatedItem);
    data[index] = { ...data[index], ...updatedItem };
    writeJSONFile(data);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data[index]));
  });
};

const handleDelete = (req, res) => {
  console.log("Handling DELETE request");
  const { query } = parse(req.url, true);
  const id = parseInt(query.id);

  if (isNaN(id)) {
    res.statusCode = 400;
    res.end('ID is required and must be a number.');
    return;
  }

  const data = readJSONFile();
  const index = data.findIndex(item => item.id === id);

  if (index === -1) {
    res.statusCode = 404; 
    res.end('Item not found.');
    return;
  }

  data.splice(index, 1);
  writeJSONFile(data);

  res.statusCode = 200;
  res.end('Item deleted.');
};

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/shopping-list`);
});