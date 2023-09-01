const User = require("../models/userModel");
const Product = require("../models/productModel");
const Voucher = require("../models/voucherModel");

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
  const { code, discountPercentage, maxDiscount, expireDate } = req.body;

  const voucher = await Voucher.create({
    code,
    discountPercentage,
    maxDiscount,
    expireDate,
  });

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

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  if (discount > 60) {
    return next(new AppError("Discount must be less than 60", 400));
  }

  const productDiscount = product.price * (discount / 100);

  await Product.findByIdAndUpdate(productId, {
    discountPercentage: discount,
    discountedPrice: product.price - productDiscount,
  });

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
