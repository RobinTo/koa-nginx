/**
 * Created by ly_wu on 2017/6/21.
 */
const path          = require("path");
const HttpProxy     = require('http-proxy');
const proxyServer   = HttpProxy.createProxyServer();
const compose       = require("./compose");

class Proxy {
    constructor() {

    }
    static nginx (context, options){
        return (ctx, next) => {
            if (!ctx.url.startsWith(context)){
                return next();
            }
            const { logs, rewrite, next } = options;
            options.headers = ctx.request.headers;
            return new Promise((resolve, reject) => {
                if (logs){
                    console.log('%s - proxy - %s %s', new Date().toISOString(), ctx.req.method, ctx.req.url);
                }
                if (typeof rewrite === 'function') {
                    ctx.req.url = rewrite(ctx.url);
                }
                proxyServer.web(ctx.req, ctx.res, options);
                if(next) {
                    proxyServer.on('proxyRes', function(proxyRes, req, res){
                        proxyRes.on('data' , function(dataBuffer){
                            var data = dataBuffer.toString('utf8');
                            ctx.body = data;
                            ctx.proxySuccess = true;
                            next();
                        });
                    });
                }
            })
        }
    }
    proxy(proxies){
        let mildArr = [];
        if(proxies){
            proxies.forEach(function(proxy){
                let pattern = new RegExp("^\/"+proxy.context+"(\/|\/\w+)?");
                mildArr.push(Proxy.nginx(
                    "/" + proxy.context,
                    {
                        target: proxy.host,
                        changeOrigin: true,
                        xfwd: true,
                        rewrite: proxy.rewrite?path => path.replace(pattern, ''):"",
                        logs: true,
                        next: proxy.next || false,
                    }
                ));
            })
        }
        return compose(mildArr);
    }
}

module.exports = new Proxy;