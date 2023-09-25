const User = require("../models/userModel");
const Product = require("../models/productModel");
const Voucher = require("../models/voucherModel");
const BusinessProfile = require("../models/businessProfileModel");
const SalonService = require("../models/salonModel");
const Consultant = require("../models/consultationModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

exports.getAllVouchers = async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']
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

  return factory.getAllMagdy(req, res, next, Voucher);
};
exports.getVoucher = async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']

  return factory.getOne(req, res, next,Voucher);
}; 

exports.createVoucher = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']
  const { code, discountPercentage, maxDiscount, expireDate, type } = req.body;

  const voucher = await Voucher.create({
    type,
    code,
    discountPercentage,
    maxDiscount,
    expireDate,
  });

  if (req.user.role === "business") {
    const business = await BusinessProfile.findOne({ user: req.user.id });
    business.vouchers.push(voucher._id);
    business.save();
  } else if (req.user.role === "salon service") {
    const salonService = await SalonService.findOne({ _id: req.user.salonCreated });
    salonService.vouchers.push(voucher._id);
    salonService.save();
  } else if (req.user.role === "consultant") {
    const consultant = await Consultant.findOne({ owner: req.user.id });
    consultant.vouchers.push(voucher._id);
    consultant.save();
  }

  res.status(201).json({
    status: "success",
    voucher,
  });
});

exports.deleteVoucher = factory.deleteOne(Voucher);

exports.addDiscountToProduct = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']
  const { discount, productId } = req.body;

  const product = await Product.findById(productId);

  const voucher = await Voucher.findOne({ code: discount })

  if (voucher.type !== "Product"){
    return next(new AppError("This voucher is not for product", 400));
  }

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  if (!voucher) {
    return next(new AppError("No voucher found with that code", 404));
  }

  if(voucher.used) {
    return next(new AppError("This voucher has been used", 400));
  }

  let productDiscount

  if ( product.price - product.price * (voucher.discountPercentage / 100) > voucher.maxDiscount) {
    productDiscount = product.price - voucher.maxDiscount
  } else {
    productDiscount = product.price * (voucher.discountPercentage / 100);
  }

  console.log(voucher)

  console.log(product.price)
  console.log(voucher.discountPercentage)
  console.log(productDiscount)

  await Product.findOneAndUpdate({ _id: productId }, {
    discountPercentage: voucher.discountPercentage,
    discountedPrice: Product.price,
    price: productDiscount,
  });

  voucher.used = true;
  voucher.save();

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.removeDicountFromProduct = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']
  const ProductId = req.params.id;

  const product = await Product.findById(ProductId);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  await Product.findByIdAndUpdate(ProductId, {
    discountPercentage: 0,
    price: product.discountedPrice,
    discountedPrice: 0,
  });

  res.status(200).json({
    status: "success",
    data: {
      product,
    },
  });
});

exports.addVoucherToUser = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Vouchers & Discounts']
  const userId = req.user.id;
  const { code } = req.body;

  const voucher = await Voucher.findOne({ code });

  if (voucher.used) {
    return next(new AppError("This voucher has been used", 400));
  }

  if (voucher.owned) {
    return next(new AppError("This voucher has been owned", 400));
  }

  await User.findByIdAndUpdate(userId, {
    $push: { vouchers: voucher._id },
  });

  await Voucher.findByIdAndUpdate(voucher._id, {
    owned: true,
    user: userId,
  });

  res.status(200).json({
    status: "success",
    data: {
      voucher,
    },
  });
});
