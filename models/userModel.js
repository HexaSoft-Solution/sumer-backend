const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    stockName: {
      type: String,
    },
    salonName: {
      type: String,
    },
    invoices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    }],
    transactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    }],
    salonBooking: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalonBooking",
    }],
    email: {
      type: String,
      required: [true, "email-required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "email-invalid"],
    },
    username: {
      type: String,
      required: [true, "username-required"],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, "telephone-required"],
      unique: true,
    },
    role: {
      type: String,
      enum: [
        "individual",
        "consultant",
        "business",
        "admin",
        "deliver",
        "salon service",
      ],
      default: "individual",
    },
    birthDate: {
      type: Date,
      validate: [validator.isDate, "date-invalid"],
    },
    image: {
      type: String,
    },
    creditCards: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "CreditCard",
    }],
    password: {
      type: String,
      required: [true, "password-required"],
      minlength: 8,
      maxLength: 32,
      select: false,
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
    balance: {
      type: Number,
      default: 0,
    },
    passwordConfirm: {
      type: String,
      // required: [true, "password-confirm"],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "password-not-same",
      },
    },
    passwordChangedAt: {
      type: Date,
    },
    lovedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    lovedSalons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Salon",
      },
    ],
    productsCreated: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    salonCreated: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      default: null,
    },
    BusinussProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
    salonBooking: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalonBooking",
    }],
    cart: {
      items: [{
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },],
      voucher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Voucher",
      },
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        default: [],
      },
    ],
    productCreationAvailability: {
      type: Number,
      default: 0,
    },
    productAds: {
      type: Number,
      default: 0,
    },
    vouchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Voucher",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    paypalAccount: {
      type: String,
      default: "",
    },
    paypalUsername: {
      type: String,
      default: ""
    },
    consultantConnection: {
      type: Number,
      default: 0,
    },
    createConsultation: {
      type: Boolean,
      default: false,
    },
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      default: null,
    },
    modifiedAt: {
      type: Date,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    emailActive: {
      type: Boolean,
      default: false,
    },
    consultant: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant"
    }],
    createConsultant: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation"
    }],
    supprots: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Support"
    }],
    paypalEmails: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "paypal-emails"
    }],
    userPhoto: String,
    cloudinaryId: String,
    forgetPasswordOTP: String,
    passwordResetToken: String,
    passwordResetTokenOTP: String,
    passwordResetExpires: Date,
    verifyEmailOTPToken: String,
    verifyEmailExpires: Date,
    googleId: String,
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.populate('addresses')
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.createVerifyEmailOTP = function (OTP) {
  this.verifyEmailOTPToken = crypto
    .createHash("sha256")
    .update(OTP)
    .digest("hex");

  console.log({ OTP }, this.verifyEmailOTPToken);

  this.verifyEmailExpires = Date.now() + 10 * 60 * 1000;
  return OTP;
};

userSchema.methods.createForgetPasswordOTP = function (OTP) {
  this.forgetPasswordOTP = crypto
    .createHash("sha256")
    .update(OTP)
    .digest("hex");

  console.log({ OTP }, this.forgetPasswordOTP);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return OTP;
};

userSchema.methods.createPasswordResetTokenOTP = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetTokenOTP = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetTokenOTP);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
