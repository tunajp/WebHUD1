import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as https from 'https';

import fetch from 'node-fetch';
import { hasUncaughtExceptionCaptureCallback } from 'process';

const ASSETS_DIR = "./assets";

const agent = new https.Agent({
    //rejectUnauthorized: false,
    ca: fs.readFileSync("./LindenLab.crt"),
    cert: fs.readFileSync("./LindenLab.crt")
});

function errorRespontse(response, error) {
    response.writeHead(500);
    response.end('Sorry, check with the site admin for error: ' + error.toString() + '..\n');
    response.end();

}

function http_in_request() {
    // return処理
    // https://web.dev/promises/#queuing-asynchronous-actions
}

http.createServer( (request, response) => {
    console.log('request', request.url);

    let http_in_url;

    // curl -X POST -H "Content-Type: application/json" -d '{"Name":"sensuikan1973", "Age":"100"}' "http://localhost:8080/api/v1/users?id=10&url=https://www.google.com"
    if (request.method === "POST") {

        // curl localhost:8080/?url=https://hoge
        // POSTでもGETのパラメータは取得できるので常にURLパラメータにurl=http-inのurlをつければいい
        // prim側はURLが変わるたびにメディアをリロードすればいい
        try {
            const url_parse = url.parse(request.url, true);
            console.log(url_parse);
            http_in_url = url_parse.query['url'];
            console.log(http_in_url);
            if (http_in_url == undefined) {
                throw "Undefined url parameter";
            }

            // security url check
            // https://simhost-xxxx.agni.secondlife.io:12043/cap/xxxx-xxxx-xxxx-xxxx
            let checkuri = new URL(http_in_url);
            let domain = checkuri.hostname;
            let parts = domain.toString().split('.'.toString());
            console.log(parts[parts.length - 2]);
            if (parts[parts.length - 2] != "secondlife") {
                console.log("NOT SECONDLIFE");
                throw "NOT SECONDLIFE";
                return;
            } else {
                console.log("SECONDLIFE");
            }
        } catch (error) {
            console.log(error);
            errorRespontse(response, error);
            return;
        }

        let post = "";
        request.on('data', (chunk) => {
            post += chunk;
        });
        request.on('end', () => {
            let data = JSON.parse(post);
            console.log(data);

            //console.log(data.Name);
            console.dir(data);

            // http-inに投げる
            // rezするとスクリプトが動いてないみたいだが、HUDとして身につければurlが再発行される
            // ->on_rezでllResetScript()を呼べば解決した
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const body = JSON.stringify(data);
            fetch(http_in_url, {method: 'POST', headers, body, agent})
                .then((res) => {
                    if (!res.ok) {
                        // 200 系以外のレスポンスはエラーとして処理
                        throw new Error(`${res.status} ${res.statusText}`);
                    }
                    console.log(res.headers.get('content-type'));
                    response.writeHead(200, {'Content-Type': res.headers.get('content-type')});
                    return res.text();
                })
                .then(text => {
                    console.log(text);

                    response.end(text, 'utf-8');
                })
                .catch((err) => {
                    console.error(err);
                    errorRespontse(response, err);
                });

        });
    } else {
        //
        // ここから通常のWeb Server
        //

        // パラメータの削除
        const request_file = request.url.split("?").shift();

        let filePath = ASSETS_DIR + request_file;
        console.log(filePath);

        if (filePath == ASSETS_DIR + "/") { // TODO:下のディレクトリでも/終わりなら処理する
            filePath = ASSETS_DIR + "/index.html"
        }
        console.log("readfile:" + filePath);

        let extname = String(path.extname(filePath)).toLocaleLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.wav': 'audio/wav',
            '.mp4': 'video/mp4',
            '.woff': 'application/font-woff',
            '.ttf': 'application/font-ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'application/font-otf',
            '.svg': 'application/image/svg+xml'
        };

        let contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code == 'ENOENT') {
                    fs.readFile(ASSETS_DIR + '/404.html', (error, content) => {
                        response.writeHead(404, {"Content-Type": 'text/html'});
                        response.end(content, 'utf-8');
                    });
                } else {
                    response.writeHead(500);
                    response.end('Sorry, check with the site admin for error: ' + error.code + '..\n');
                    response.end();
                }
            } else {
                response.writeHead(200, {'Content-Type': contentType});
                response.end(content, 'utf-8');
            }
        });

    }

}).listen(8080);

console.log('Server running at port 8080');