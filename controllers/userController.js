const User = require("../models/userModel");
const Address = require("../models/addressModel");
const Voucher = require("../models/voucherModel");
const Product = require("../models/productModel");
const Salon = require("../models/salonModel");
const BusinessProfile = require("../models/businessProfileModel");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const cloudinary = require("../utils/cloudinary");

const jwt = require("jsonwebtoken");
const Consultation = require("../models/consultationModel");

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

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const filterArrayOfObjects = (arr, ...allowedFields) => {
  return arr.map((obj) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  });
};

exports.getMe = (req, res, next) => {
  // #swagger.tags = ['Authentication']
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const { firstName, lastName, name, stockName, username, phone } = req.body;

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      firstName,
      lastName,
      name,
      stockName,
      username,
      phone,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(201).json({
    status: "success",
    data: null,
  });
});

exports.myProfile = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const userId = req.user.id;

  if (req.user.role === "consultant") {
    const consultation = await Consultation.findOne({ owner: userId });

    if (!consultation) {
      return next(new AppError("You don't have a consultation profile", 400));
    }

    res.status(200).json({
      status: "success",
      profile: consultation,
        owner: req.user,
    });
  } else if (req.user.role === "salon service") {
    if (!req.user.salonCreated) {
      return next(new AppError("You don't have a salon profile", 400));
    }
    const salon = await Salon.findById(req.user.salonCreated);

    if (!salon) {
      return next(new AppError("You don't have a salon profile", 400));
    }

    res.status(200).json({
      status: "success",
      profile: salon,
      owner: req.user,
    });
  } else if (req.user.role === "business") {
    const businessProfile = await BusinessProfile.findOne({ user: userId });

    if (!businessProfile) {
      return next(new AppError("You don't have a business profile", 400));
    }

    res.status(200).json({
      status: "success",
      profile: businessProfile,
      owner: req.user,
    });
  }
});

exports.createUser = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const newUser = await User.create({
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
  createSendToken(newUser, 201, res);
});

exports.uploadPersonalPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  /*	#swagger.requestBody = {
            required: true,
            "@content": {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            image: {
                                type: "string",
                                format: "binary"
                            }
                        },
                        required: ["image"]
                    }
                }
            } 
        }
    */
  const user = await User.findById(req.user.id);
  const result = await cloudinary.uploader.upload(req.file.path, {
    public_id: `/${user.username}/${user.username}PersonalPhoto`,
    folder: "users",
    resource_type: "image",
  });
  const updatedUser = await User.findByIdAndUpdate(req.user.id, {
    userPhoto: result.secure_url,
    cloudinaryId: result.public_id,
  });
  res.status(201).json({
    status: "success",
    updatedUser,
  });
});

exports.addAddress = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const userId = req.user.id;
  const { street, city, houseNo, latitude, longitude, houseType } = req.body;
  const address = await Address.create({
    street,
    city,
    houseNo,
    latitude,
    longitude,
    houseType,
  });

  await User.findByIdAndUpdate(
    userId,
    {
      $push: { addresses: address.id },
    },
    { new: true }
  );

  res.status(201).json({
    status: "success",
    message: "Address Add successful",
  });
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  const userId = req.user.id;
  const addressId = req.params.addressId;
  await Address.findByIdAndRemove(addressId);
  await User.findByIdAndUpdate(userId, {
    $pull: { addresses: addressId },
  });

  res.status(201).json({
    status: "success",
    message: "address remove successful",
  });
});

exports.getUsers = async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  /*  #swagger.description = 'TO CUSTOMIZE YOUR REQUEST: ?price[gte]=1000&price[lte]=5000 OR ?category[in]=electronics,clothing OR ?page=3&sort=-createdAt&limit=20&fields=name,description ' */
  /*  #swagger.parameters['limit'] = {
                in: 'query',
                description: 'Page size: ex: ?limit=10',
  type: 'number'
        } */
  /*  #swagger.parameters['fields'] = {
                in: 'query',
                description: 'example: ?fields=name,description' ,
        } */
  /*  #swagger.parameters['page'] = {
                in: 'query',
                description: 'indexing page: ex: ?page=2',
  type: 'number'
        } */
  /*  #swagger.parameters['sort'] = {
                in: 'query',
                description: 'example: ?sort=name,-createdAt',
        } */

  return factory.getAllMagdy(req, res, next, User);
};

exports.getUser = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Authentication']
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No document found with that ID. 404"));
  }

  const voucherId = user.vouchers;

  const voucher = await Voucher.find({
    _id: { $in: voucherId },
  });

  const addressId = user.addresses;

  const address = await Address.find({
    _id: { $in: addressId },
  });

  const cart = user.cart;
  console.log(cart);
  const arr = [];
  await Promise.all(
    cart.map(async (e, i) => {
      const product = await Product.findById(e.product);
      arr.push({
        product,
      });
    })
  );

  res.status(200).json({
    status: "success",
    user,
    cart: arr,
    voucher,
    address,
  });
});
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
