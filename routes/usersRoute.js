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
    console.log("user after login",user);

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return response.status(400).send({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: user._id }, "secretKey", { expiresIn: "1h" });

    // Inside your login route
    response.json({
      token,
      user,
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
    // const userId = request.body.user.Id;

    // // Update user properties in the database
    // const updatedUser = await User.findByIdAndUpdate(
    //   userId,
    //   { isPaymentVerified: true, userType: "seller" },
    //   { new: true } // Returns the updated user
    // );

    // console.log(updatedUser)
    // if (!updatedUser) {
    //   return response.status(404).json({ message: "User not found" });
    // }

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

    // Send the session ID and updated user back to the client
    response.json({ session });
  } catch (error) {
    console.error(error);
    response.status(500).send({ message: "Internal server error" });
  }
});

router.post("/verify-user", async (req, res) => {
  console.log("request received");
  try {
    const userId = req.body.userId;
    console.log(userId);
    // Assuming you have a User model/schema
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user properties
    user.isPaymentVerified = true;
    user.userType = "seller";

    // Save the updated user
    await user.save();
    console.log(user);

    // Send the updated user object in the response
    res.json({ user });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
