import express from "express";
import { PORT, mongoDBURL } from "./config.js";
import mongoose from "mongoose";
import usersRoute from "./routes/usersRoute.js";
import cors from 'cors'
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const verifyToken = (request, response, next) => {
    const token = request.header("auth-token");
  
    if (!token) {
      return response.status(401).send({
        message: "Access denied. Please provide a valid token.",
      });
    }
  
    try {
      const decoded = jwt.verify(token, "secretKey");
      request.user = decoded;
      next();
    } catch (error) {
      response.status(400).send({
        message: "Invalid token",
      });
    }
  };

app.use(cors())
app.use("/users", usersRoute);

app.get("/protected", verifyToken, (request, response) => {
    response.send({
      message: "You have access to this protected route.",
    });
  });

mongoose
  .connect(mongoDBURL)
  .then((result) => {
    console.log("app connected to database!");
    app.listen(PORT, () => {
      console.log(`App is Listening to Port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
});
