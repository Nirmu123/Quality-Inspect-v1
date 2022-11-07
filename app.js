const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const createError = require("http-errors");
const PORT = 3000;

const operatorRouter = require("./routes/operator");
const adminRouter = require("./routes/admin");

const app = express();

app.set("views", path.resolve(__dirname,"views"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(express.urlencoded({ extended: false }));

app.use("/css", express.static("css"));
app.use("/static", express.static("static"));
app.use("/script", express.static("script"));

app.use("/operator", operatorRouter);
app.use("/admin", adminRouter);

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err.status + " " + err.message);
});

app.listen(PORT, () => {
    console.log("Server is running!!!!");
});

module.exports = app;

