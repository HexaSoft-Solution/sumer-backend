const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./path/swagger-output.json");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/ProductRoutes");
const reviewRoutes = require("./routes/ReviewRoutes");
const discountVoucherRoutes = require("./routes/discountVoucherRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const salonRoutes = require("./routes/salonRoutes");
const salonReviewRoutes = require("./routes/salonReviewRoutes");
const salonBookingRoutes = require("./routes/salonBookingRoutes");
const consultationRoutes = require("./routes/consultationRoutes");

const app = express();

// app.enable("trust proxy");
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      allowOrigins: ["*"],
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["*"],
        scriptSrc: ["* data: 'unsafe-eval' 'unsafe-inline' blob:"],
      },
    },
  })
);
app.use(
  cors({
    origin: [
      "*",
      "http://*",
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:8000",
      "https://sumer.vercel.app",
      "http://localhost:4200",
    ],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 10000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.use(mongoSanitize());

app.use(xss());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

app.use("/swagger-json", (req, res, next) =>
  res.status(200).json(swaggerDocument)
);
app.use("/swagger-api", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/discountVouchers", discountVoucherRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/salons", salonRoutes);
app.use("/api/v1/salonReviews", salonReviewRoutes);
app.use("/api/v1/salonBooking", salonBookingRoutes);
app.use("/api/v1/consultation", consultationRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
