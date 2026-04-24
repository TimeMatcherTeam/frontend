const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');


const app = express();
const PORT = 3000;


app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile("/public/pages/index.html", { root: __dirname });
  res.status(200);
})

app.get("/group_meeting/:meetingId", (req, res) => {
  res.sendFile("/public/pages/group_meeting.html", { root: __dirname });
  res.status(200);
})

app.get("/profile", (req, res) => {
  res.sendFile("/public/pages/profile.html", { root: __dirname });
  res.status(200);
})

app.get("/meeting", (req, res) => {
  res.sendFile("/public/pages/meeting.html", { root: __dirname });
  res.status(200);
})


app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});