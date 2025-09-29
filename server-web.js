import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8080;

const server = http.createServer((req, res) => {
  let filePath = './reportes.html';
  
  // Si la URL es raíz, servir reportes.html
  if (req.url === '/' || req.url === '/reportes' || req.url === '/reportes.html') {
    filePath = './reportes.html';
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.html':
      contentType = 'text/html';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.js':
      contentType = 'text/javascript';
      break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Archivo no encontrado');
      } else {
        res.writeHead(500);
        res.end(`Error del servidor: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Servidor web corriendo en http://localhost:${PORT}`);
  console.log(`📊 Accede a los reportes en: http://localhost:${PORT}/reportes`);
  console.log(`🔗 API Backend disponible en: http://localhost:3000`);
});