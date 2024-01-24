import express from "express";
import { User } from "../models/UserModel.js";
// import bcrypt from "bcrypt";
import bcrypt from "bcryptjs";
import stripeLib from "stripe";

const STRIPE_SECRET =
  "sk_test_51Obp44KAlnAzxnFU9PrEBv0K27IsOThelFXmUSTkJk7nhzQ0V20hHm75bDPLsYnPnwWs52TIzmz61rUn1U3uQxH500Ob1C6BIw";
const stripe = stripeLib(STRIPE_SECRET);
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/register", async (request, response) => {
  try {
    const { email, username, password, phoneno } = request.body;

    if (!email || !username || !password || !phoneno) {
      return response.status(400).send({
        message:
          "Please provide all required fields: email, username, password, phoneno",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return response.status(400).send({
        message:
          "User with this email already exists. Please choose a different email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      phoneno,
    });

    await newUser.save();
    return response
      .status(201)
      .send({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    response.status(500).send({ message: "Internal server error" });
  }
});

router.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).send({
        message: "Please provide both email and password",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return response.status(400).send({
        message: "Invalid credentials",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return response.status(400).send({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, "secretKey", { expiresIn: "1h" });

    response.json({
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (error) {
    console.log(error);
    response.status(500).send({ message: "Internal server error" });
  }
});

router.post("/payment", async (request, response) => {
  try {
    const paymentAmount = request.body.paymentAmount;
    const amountInCents = paymentAmount * 100;

    // Perform payment processing with Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: "1 Month Subscription",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    // Send the session ID back to the client
    response.json({ session });
  } catch (error) {
    console.error(error);
    response.status(500).send({ message: "Internal server error" });
  }
});

export default router;
