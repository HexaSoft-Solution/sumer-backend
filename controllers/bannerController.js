const Banner = require('../models/bannarModel');

const factory = require("./handlerFactory");

const cloudinary = require("../utils/cloudinary");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createBanner = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Banner']
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
                              },
                              name: {
                                  type: "string",
                              },
                              link: {
                                  type: "string",
                              }

                          },
                          required: ["image", "name", "link"]
                      }
                  }
              }
          }
      */

    const { name, link } = req.body;
    const { path } = req.file;

    const result = await cloudinary.uploader.upload(path, {
        public_id: `/${name}-${Math.random() * 10000000000}/${name}Photo`,
        folder: "Banner",
        resource_type: "image",
    });

    if (!result) {
        return next(
            new AppError("Something went wrong with the image upload", 400)
        );
    }

    const banner = await Banner.create({
        name,
        link,
        image: result.secure_url,
        cloudinary_id: result.public_id,
    });

    res.status(201).json({
        status: "success",
        banner
    });
})


exports.getAllBanners = async (req, res, next) => {
    // #swagger.tags = ['Banner']
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

    return factory.getAllMagdy(req, res, next, Banner);
}

exports.updateBanner = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, link } = req.body;

    const updatedBanner = await Banner.findOneAndUpdate(
        { _id: id},
        { name, link },
        { new: true }
    )

    res.status(200).json({
        status: "success",
        updatedBanner
    });
})

exports.updateBannerPhoto = catchAsync(async (req, res, next) => {
    const { cloudinary_id } = req.params;
    const { path } = req.file;

    const result = await cloudinary.uploader.upload(path, {
        public_id: `/${name}-${Math.random() * 10000000000}/${name}Photo`,
        folder: "Banner",
        resource_type: "image",
    });

    if (!result) {
        return next(
            new AppError("Something went wrong with the image upload", 400)
        );
    }

    await cloudinary.uploader.destroy(cloudinary_id);

    const updatedBanner = await Banner.findOneAndUpdate(
        { cloudinary_id },
        { image: result.secure_url, cloudinary_id: result.public_id },
        { new: true }
    )

    res.status(200).json({
        status: "success",
        updatedBanner
    });
})

exports.deleteBanner = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const banner = await Banner.findById(id);

    if (!banner) {
        return next(new AppError("No banner found with that ID", 404));
    }

    await cloudinary.uploader.destroy(banner.cloudinary_id);

    await banner.remove();

    res.status(200).json({
        status: "success",
        message: "Banner deleted successfully",
    });
})