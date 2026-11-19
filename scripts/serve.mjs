import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!=='127.0.0.1:5173'){res.writeHead(403).end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1:5173').pathname);
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}
    if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
    const bytes=await readFile(file);
    let type=mime[extname(file)]??'application/octet-stream';
    if(extname(file)==='.img')type=bytes[0]===0x89?'image/png':bytes[0]===0xff?'image/jpeg':bytes.toString('ascii',0,4)==='RIFF'?'image/webp':'image/gif';
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Port 5173 is already in use. Open http://127.0.0.1:5173 or close the other server.':e);process.exitCode=1});
server.listen(5173,'127.0.0.1',()=>console.log('DDR WORLD: http://127.0.0.1:5173  (Ctrl+C to stop)'));
