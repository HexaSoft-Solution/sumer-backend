const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");

const User = require("../models/userModel");
const Salon = require("../models/salonModel");
const BusinussProfile = require("../models/businessProfileModel");

const sendEmail = require("../utils/emails");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  let newUser = null;
  // Check for duplicate email
  const existingEmailUser = await User.findOne({ email: req.body?.email });
  if (existingEmailUser) {
    return next(new AppError("email-duplicated", 400));
  }

  // Check for duplicate phone number
  const existingPhoneUser = await User.findOne({ phone: req.body?.phone });
  if (existingPhoneUser) {
    return next(new AppError("phone-duplicated", 400));
  }
  // Check for duplicate username
  const existingUsername = await User.findOne({ username: req.body?.username });
  if (existingUsername) {
    return next(new AppError("username-duplicated", 400));
  }
  newUser = await User.create({
    name: req.body.name,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    stockName: req.body.stockName,
    salonName: req.body.salonName,
    role: req.body.role,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  if (req?.body?.role === "business") {
    await BusinussProfile.create({
      user: newUser.id,
    });
  }

  if (req?.body?.role === "salon service") {
    const salon = await Salon.create({
      name: req.body.salonName,
      phone: req.body.phone,
    });
    newUser.salonCreated = salon.id;
  }

  const OTP = Math.floor(100000 + Math.random() * 900000).toString();
  newUser.createVerifyEmailOTP(OTP);
  await newUser.save({ validateBeforeSave: false });
  const message = `Verify Your email ? \n Your OTP Code is ${OTP}.\nIf you didn't forget your password, please ignore this email!`;
  try {
    await sendEmail({
      email: newUser.email,
      subject: "Your OTP verify email (valid for 10 min)",
      message,
    });

    createSendToken(newUser, 201, res);
  } catch (err) {
    console.log(err);
    newUser.verifyEmailOTPToken = undefined;
    newUser.verifyEmailExpires = undefined;
    await newUser.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password"), 400);
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("invalid-credentials", 401));
  }

  createSendToken(user, 200, res);
});

exports.loginMobile = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { phone, password } = req.body;

  if (!phone || !password) {
    return next(new AppError("Please provide email and password"), 400);
  }

  const user = await User.findOne({ phone }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("invalid-credentials", 401));
  }

  createSendToken(user, 200, res);
});

exports.loginUsername = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError("Please provide email and password"), 400);
  }

  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("invalid-credentials", 401));
  }

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  // 1) Getting to token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("not-authorized", 401)
    );
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError("The user belonging to this token does no longer exist."),
      401
    );
  }

  if (!freshUser.emailActive) {
    return next(
      new AppError(
        "The user belonging to this token is inactive, Please active your Email."
      ),
      401
    );
  }

  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // #swagger.tags = ['Authentication']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You  do not have permission to perform this action", 403)
      );
    }
    next();
  };

exports.resendVerifyOTPEmail = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { email } = req.body;
  const user = await User.findOne({ email });

  const OTP = Math.floor(100000 + Math.random() * 900000).toString();
  const verifyEmailToken = user.createVerifyEmailOTP(OTP);
  await user.save({ validateBeforeSave: false });
  const message = `Verify Your email ? \n Your OTP Code is ${OTP}.\nIf you didn't forget your password, please ignore this email!`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your OTP verify email (valid for 10 min)",
      message,
    });
    res.status(201).json({
      status: "success",
      message: "OTP Sent successful",
    });
  } catch (err) {
    console.log(err);
    user.verifyEmailOTPToken = undefined;
    user.verifyEmailExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.OTP)
    .digest("hex");
  console.log(hashedToken);

  const user = await User.findOneAndUpdate(
    {
      verifyEmailOTPToken: hashedToken,
      verifyEmailExpires: { $gt: Date.now() },
    },
    {
      emailActive: true,
      verifyEmailOTPToken: undefined,
      verifyEmailExpires: undefined,
    }
  );
  console.log(user);
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  createSendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with email address.", 404));
  }
  const OTP = Math.floor(100000 + Math.random() * 900000).toString();
  await user.createForgetPasswordOTP(OTP);
  await user.save({ validateBeforeSave: false });

  const message = `Forgot your password ? \n Your OTP Code is ${OTP}.\nIf you didn't forget your password, please ignore this email!`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "OTP sent to email!",
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.verifyForgetPasswordOTP = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const HashedOTP = crypto
    .createHash("sha256")
    .update(req.params.OTP)
    .digest("hex");

  const user = await User.findOne({
    forgetPasswordOTP: HashedOTP,
    passwordResetExpires: { $gt: Date.now() },
  });

  const resetToken = user.createPasswordResetTokenOTP();
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    verifyPasswordToken: resetToken,
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  console.log(hashedToken);

  const user = await User.findOne({
    passwordResetTokenOTP: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 300));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  // #swagger.tags = ['Authentication']
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.isLoggedIn = async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.googleAuth = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { code } = req.query;

  const tokenExchangeUrl = 'https://oauth2.googleapis.com/token';

  const requestData = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_SECRET_KEY,
    redirect_uri: `${req.protocol}://${req.get("host")}/api/v1/users/auth/google/callback`,
    grant_type: 'authorization_code',
  };

  const response = await axios.post(tokenExchangeUrl, null, {
    params: requestData,
  });

  // Extract access and refresh tokens from the response
  const { access_token, refresh_token, id_token } = response.data;

  // Now you can use these tokens to access the Google API for profile and email information
  
  // Make another request to the Google API to fetch profile and email
  const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  console.log(profileResponse.data)

  const { id, name, email, picture } = profileResponse.data;

  const user = await User.findOne({ email });

  if (user) {
    createSendToken(user, 200, res);
  } else {
    res.status(200).json({
      status: 'success',
      message: 'Google Auth Success but we need more information',
      googleAuthData:  profileResponse.data
    });
  }
});


exports.facebookAuth = catchAsync(async (req, res, next) => {

})
