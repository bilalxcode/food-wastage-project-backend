import express from "express";
import { User } from "../models/UserModel.js";
// import bcrypt from "bcrypt";
import bcrypt from "bcryptjs";
import stripeLib from "stripe";
import multer from "multer"; // For handling file uploads
import { Product } from "../models/ProductModal.js";

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
    console.log("user after login", user);

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

// router.post("/get-user", async (req, res) => {
//   try {
//     const userId = req.body.userId;
//     console.log(userId);
//     // Search for the user in the database using the provided userId
//     const user = await User.findById(userId);

//     if (!user) {
//       console.log("user not sent", user);

//       return res.status(404).json({ error: "User not found" });
//     }

//     console.log("user sent", user);

//     res.status(200).json(user);
//   } catch (error) {
//     console.error("Error fetching user details: ", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.post("/get-user", async (req, res) => {
  try {
    const userId = req.body.userId;
    console.log(userId);

    // Search for the user in the database using the provided userId
    const user = await User.findById(userId);

    if (!user) {
      console.log("user not sent", user);
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the user's products
    const userProducts = await Product.find({ user: userId });

    // Combine user details and products in the response
    const responseData = {
      user: user,
      products: userProducts,
    };

    console.log("user and products sent", responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching user details: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/addProduct", upload.array("images[]"), async (req, res) => {
  try {
    // Extract form data from the request
    const { name, price, expiryDate, description, userId, expiryStatus } =
      req.body;

    console.log(name, price, expiryDate, description, userId, expiryStatus);
    // Create an array of image URLs from the uploaded files
    const images = req.files.map((file) => `/uploads/${file.filename}`);

    // Assuming you have a user ID associated with the request (you may use JWT for authentication)
    // const userId = "user_id_here"; // Replace with the actual user id

    // Create a new product
    const newProduct = new Product({
      name,
      price,
      expiryStatus,
      expiryDate: new Date(expiryDate), // Convert expiryDate to Date object
      description,
      images,
      user: userId,
    });

    // Save the product to the database
    await newProduct.save();

    console.log("product added", newProduct);
    res.status(200).json({ message: "Product added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/make-user-buyer", async (req, res) => {
  const { userId } = req.body;

  try {
    // Find the user by ID and update the userType to 'buyer'
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { userType: "buyer" },
      { new: true } // To get the updated user in the response
    );

    if (!updatedUser) {
      console.log("error");
      return res.status(404).json({ error: "User not found" });
    }

    // Send the updated user object in the response
    console.log("user type is buyer", updatedUser);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error("Error making user a buyer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/get-products", async (req, res) => {
  try {
    // Fetch the user's products
    const products = await Product.find();

    // Combine user details and products in the response
    const responseData = {
      products: products,
    };
    res.status(200).json(responseData);
    console.log(products);
  } catch (error) {
    console.error("Error fetching user details: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// update-cart endpoint
// update-cart endpoint
router.post("/buy-product", async (request, response) => {
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
              name: "Your Order",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/buyer-dashboard",
      cancel_url: "http://localhost:3000/buyer-dashboard",
    });

    // Send the session ID and updated user back to the client
    response.json({ session });
  } catch (error) {
    console.error(error);
    response.status(500).send({ message: "Internal server error" });
  }
});

router.delete("/delete-all-products", async (req, res) => {
  try {
    // Use Mongoose to delete all documents in the Product collection
    const result = await Product.deleteMany({});

    // Send a response indicating success
    res
      .status(200)
      .json({ message: "All products deleted successfully", result });
  } catch (error) {
    // Handle errors and send an error response
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
export default router;
