const Category = require("../models/categoryModel");
const Product = require("../models/productModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllCategories = async (req, res, next) => {
  // #swagger.tags = ['Category']
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

  return factory.getAllMagdy(req, res, next, Category);
};

exports.getCategory = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Category']
  const category = await Category.findById(req.params.id);

  const products = await Product.find({
    _id: { $in: category.ProductsIds },
  });

  if (!category) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    category,
    products,
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Category']
  const { name, desc } = req.body;

  const category = await Category.create({ name, desc });

  res.status(201).json({
    status: "success",
    category,
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Category']
  const categoryId = req.params.id;
  const { name, desc } = req.body;

  const category = await Category.findByIdAndUpdate(categoryId, { name, desc });

  res.status(201).json({
    status: "success",
    category,
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Category']
  const doc = await Category.findById(req.params.id);

  await Product.findOneAndDelete({
    categoryId: doc.id,
  });

  await Category.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  res.status(201).json({
    status: "success",
    data: null,
  });
});
