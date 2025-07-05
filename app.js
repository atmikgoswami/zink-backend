const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

const middlewares = require("./middlewares");
const routes = require("./routes");

const app = express();

const frontUri = `${process.env.FRONT_HOST}`;

//app.use(cors({ origin: frontUri, credentials: true }));

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Zink API",
    version: "1.0.0",
  });
});

app.use("/api/v1", routes);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
