const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

const Promotion = require('../models/promotionModel');

exports.createPromotion = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Promotion']
    const { 
        title,
        desc,
        day,
        promotionPoint,
        price
    } = req.body

    const newPromotion = await Promotion.create({
        title,
        desc,
        day,
        promotionPoint,
        price
    });

    res.status(201).json({
        status: 'success',
        promotion: newPromotion,
    });
});

exports.getAllPromotion = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Promotion']
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
    const allPromotions = await Promotion.find();
    const features = new APIFeatures(Promotion.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const promotions = await features.query;

    res.status(200).json({
        status: 'success',
        results: allPromotions.length,
        promotions,
    });
});

exports.getPromotion = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Promotion']
    const promotionId = req.params.id;
    const promotion = await Promotion.findById(promotionId);

    res.status(200).json({
        status: 'success',
        promotion,
    });
});

exports.updatePromotion = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Promotion']
    const promotionId = req.params.id;

    const { 
        title,
        desc,
        day,
        promotionPoint,
        price
    } = req.body

    const promotion = await Promotion.findOneAndUpdate(
        { id: promotionId},
        {
            title,
            desc,
            day,
            promotionPoint,
            price
        },
    );

    res.status(200).json({
        status: 'success',
        promotion,
    });
})

exports.deletePromotion = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Promotion']
    const promotionId = req.params.id;
    await Promotion.findByIdAndDelete(promotionId);

    res.status(204).json({
        status: 'success',
        data: null,
    });
});