const express = require("express");
const dotenv = require("dotenv");

const app = express();

const port = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(port, () => {
  console.log("Server is running in port ", +port);
});
