const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 3000;

app.post("/api/users/merge-calendar", (req, res) => {
    const http = require("http");
    
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
        const options = {
            hostname: "localhost",
            port: 5000,
            path: "/api/users/merge-calendar",
            method: "POST",
            headers: req.headers
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        
        proxyReq.on("error", (err) => {
            res.status(502).json({ error: err.message });
        });
        
        proxyReq.write(body);
        proxyReq.end();
    });
});

app.use(
    "/api",
    createProxyMiddleware({
        target: "http://localhost:5000/api",
        changeOrigin: true,
        onError: (err, req, res) => {
            console.error("Proxy error:", err);
        },
    })
);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile("/public/pages/index.html", { root: __dirname });
    res.status(200);
});

app.get("/group_meeting/:meetingId", (req, res) => {
    res.sendFile("/public/pages/group_meeting.html", { root: __dirname });
    res.status(200);
});

app.get("/profile", (req, res) => {
    res.sendFile("/public/pages/profile.html", { root: __dirname });
    res.status(200);
});

app.get("/meeting", (req, res) => {
    res.sendFile("/public/pages/meeting.html", { root: __dirname });
    res.status(200);
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
