
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllCategories = factory.getAll(Category);

exports.getCategory = catchAsync(async (req, res, next) => {
    const category = await Category.findById(req.params.id);

    const products = await Product.find({
        _id: { $in: category.ProductsIds }
    })

    if (!category) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        category,
        products
    });
});

exports.createCategory = catchAsync(async (req, res, next) => {
    const { name, desc } = req.body ;

    const category = await Category.create({ name, desc });

    res.status(201).json({
        status: "success",
        category
    });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
    const categoryId = req.params.id;
    const { name, desc } = req.body ;

    const category = await Category.findByIdAndUpdate(categoryId, { name, desc });

    res.status(201).json({
        status: "success",
        category
    });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
    const doc = await Category.findById(req.params.id);

    await Product.findOneAndDelete({
        categoryId: doc.id
    })

    await Category.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError('No document found with that ID', 404));
    }

    res.status(201).json({
        status: 'success',
        data: null
    });
});