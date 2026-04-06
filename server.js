const express = require('express');
const path = require('path');


const app = express();
const PORT = 3000;
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile("/public/pages/index.html", { root: __dirname });
  res.status(200);
})

app.get("/groups/:groupId", (req, res) => {
  res.sendFile("/public/pages/group.html", { root: __dirname });
  res.status(200);
})
app.get("/profile", (req, res) => {
  res.sendFile("/public/pages/profile.html", { root: __dirname });
  res.status(200);
})


app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});