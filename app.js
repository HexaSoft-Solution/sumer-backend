const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const passport = require('passport');
const session = require('express-session');

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

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
const consultationReviewRoutes = require("./routes/consultationReviewRoutes");
const communityRoutes = require("./routes/communityRoutes")
const bannerRoutes = require('./routes/bannerRoutes');
const swaggerDocument = require("./path/swagger-output.json");

const GoogleUsers = require('./models/googleUsersModel');
const MetaUsers = require('./models/metaUserModel')

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
      "https://sumer-dashboard.vercel.app",
      "http://localhost:4200",
    ],
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_ID,
      callbackURL: '/api/v1/users/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // Check if the user exists in the database
      const existingUser = await GoogleUsers.findOne({ googleId: profile.id });

      if (existingUser) {
        return done(null, existingUser);
      }

      console.log(accessToken, refreshToken, profile, done)

      const user = await GoogleUsers.create({
        googleId: profile.id,
        username: profile.displayName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
      })

      return done(null, user);
    }
  )
);

passport.use(new FacebookStrategy({
  clientID: process.env.META_APP_ID,
  clientSecret: process.env.META_APP_SECRET,
  callbackURL: '/api/v1/users/auth/facebook/callback/',
  state: true
}, async (accessToken, refreshToken, profile, done) => {

  const existingUser = await MetaUsers.findOne({ metaId: profile.id });

  if (existingUser) {
      return done(null, existingUser);
  }

  const user = await MetaUsers.create({
      metaId: profile.id,
      username: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: profile.emails[0].value,
  })
  
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await GoogleUsers.findOne({ googleId: id});
  done(null, user);
});

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
app.use(express.json({ limit: "10kb" }));
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
app.use('/api/v1/consultationReview', consultationReviewRoutes);
app.use("/api/v1/community", communityRoutes);
app.use("/api/v1/banner", bannerRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
