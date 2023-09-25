const Salon = require("../models/salonModel");
const SalonReview = require("../models/salonReviewModel");
const User = require("../models/userModel");
const Service = require("../models/serviceModel");
const SalonTimeTable = require("../models/salonAvailableTimeModel");
const Booking = require("../models/salonBookingModel");

const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
const cloudinary = require("../utils/cloudinary");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const SalonBooking = require("../models/salonBookingModel");
const Address = require("../models/addressModel");

const parseDate = (date) => {
  if (typeof date === "string") {
    const parts = date.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return date;
};

const isTimeConflict = (
  availableStartTime,
  availableEndTime,
  newStartTime,
  newEndTime
) => {
  const isStartConflict =
    availableStartTime <= newStartTime && availableEndTime >= newStartTime;
  const isEndConflict =
    availableStartTime <= newEndTime && availableEndTime >= newEndTime;

  return isStartConflict || isEndConflict;
};

exports.getAllSalons = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
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
  let filter = {};
  if (req.params.id) filter = { model: req.params.id };
  const allSalons = Salon.find(filter);
  const features = new APIFeatures(allSalons, req.query)
    .filter()
    .sort()
    .limitFields()
    .Pagination();
  const salons = await features.query;

  if (req.user && req.user.lovedProducts) {
    salons.forEach((salon) => {
      salon.isFavorite = req.user.lovedSalons.includes(salon._id.toString());
    });
  }

  res.status(200).json({
    status: "success",
    results: allSalons.length,
    salons,
  });
});

exports.getMySalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const userId = req.user.id;
  console.log(req.user?._id?.toString());
  const salon = await Salon.findOne({ owner: userId });
  if (!salon) {
    return next(new AppError("No salon", 404));
  }
  const Reviews = await SalonReview.find({
    salon: salon?.id,
  });

  // console.log(salon)

  res.status(200).json({
    status: "Success",
    salon,
    Reviews,
  });
});
exports.getSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const salon = await Salon.findById(req.params.id);
  const Reviews = await SalonReview.find({
    salon: salon.id,
  });

  // console.log(salon)

  res.status(200).json({
    status: "Success",
    salon,
    Reviews,
  });
});

exports.loveSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const userId = req.user.id;
  const salonId = req.params.id;

  const user = await User.findById(userId);

  if (user.lovedSalons.includes(salonId)) {
    return res.status(400).json({
      status: "fail",
      message: "You have already loved this salon",
    });
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $push: { lovedSalons: salonId },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  await Salon.findByIdAndUpdate(salonId, {
    $inc: { favouriteCount: 1 },
  });

  res.status(200).json({
    status: "success",
    message: "Salon love successfully",
  });
});

exports.unloveSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const userId = req.user.id;
  const salonId = req.params.id;

  const user = await User.findById(userId);

  if (!user.lovedSalons.includes(salonId)) {
    return res.status(400).json({
      status: "fail",
      message: "You have not loved this salon",
    });
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $pull: { lovedSalons: salonId },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  await Salon.findByIdAndUpdate(salonId, {
    $inc: { favouriteCount: -1 },
  });

  res.status(200).json({
    status: "success",
  });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
   /* #swagger.requestBody = {
      required: true,
      content: {
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
  const salonId = req.params.id;

  const salon = await Salon.findById(salonId);

  const result = await cloudinary.uploader.upload(req.file.path, {
    public_id: `/${salon._id}/${salon._id}Photo`,
    folder: "salons",
    resource_type: "image",
  });

  const updatedSalon = await Salon.findByIdAndUpdate(salonId, {
    salonPhoto: result.secure_url,
    cloudinaryId: result.public_id,
  });

  res.status(200).json({
    status: "success",
    updatedSalon,
  });
});

exports.uploadServicePhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  /* #swagger.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
               image: {
                 type: "string",
                 format: "binary"
                },
               serviceId: {
                 type: "string",
                },
            },
            required: ["image"]
          }
        }
      }
    }
  */
  const salonId = req.params.id;
  const { serviceId } = req.body;

  const salon = await Salon.findById(salonId);

  const serviceIndex = salon.service.findIndex(
    (e) => e._id.toString() === serviceId
  );

  if (!salon.service[serviceIndex]) {
    return next(new AppError("You don't have this service", 400));
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    public_id: `/${salon._id}/${Math.random() * 100000000}/${
      Math.random() * 100000000
    }-Photo`,
    folder: "salons",
    resource_type: "image",
  });

  salon.service[serviceIndex].servicePhoto = result.secure_url;
  salon.service[serviceIndex].cloudinaryId = result.public_id;

  await salon.save();

  res.status(200).json({
    status: "success",
    salon,
  });
});

exports.createSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const userId = req.user.id;

  const { name, service, about, pricePerHour, address, phone } = req.body;

  const salon = await Salon.create({
    name,
    service: service ? [{ name }] : [],
    about,
    pricePerHour,
    address,
    depositPrice,
    phone,
    owner: userId,
  });

  await User.findByIdAndUpdate(userId, {
    salonCreated: salon._id,
  });

  res.status(201).json({
    status: "success",
    message: "Salon created successfully",
    salon,
  });
});

exports.updateSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const salonId = req.params.id;

  console.log(req.user.salonCreated.toString());
  console.log(req.user);
  console.log(salonId);

  if (req.user.salonCreated.toString() !== salonId) {
    return res.status(400).json({
      status: "fail",
      message: "You are not the owner of this salon",
    });
  }

  const { name, service, about, address, phone, pricePerHour } = req.body;

  const updatedSalon = await Salon.findOneAndUpdate(
    { _id: salonId },
    {
      name,
      service,
      about,
      address,
      phone,
      pricePerHour,
    }
  );

  res.status(200).json({
    status: "success",
    message: "Salon updated successfully",
    updatedSalon,
  });
});

exports.addServices = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
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
                              description: {
                                  type: "string",
                              }

                          },
                          required: ["image"]
                      }
                  }
              }
          }
      */
  const salonId = req.user.salonCreated;

  if (!salonId) {
    return next(new AppError("You don't have a salon profile", 400));
  }

  const { name, description } = req.body;
  let result;
  let service;
  if (req?.file?.path) {
    const { path } = req.file;

    result = await cloudinary.uploader.upload(path, {
      public_id: `/${name}-${Math.random() * 10000000000}/${name}Photo`,
      folder: "services",
      resource_type: "image",
    });

    if (!result) {
      return next(
        new AppError("Something went wrong with the image upload", 400)
      );
    }

    service = await Service.create({
      name,
      description,
      servicePhoto: result.secure_url,
      cloudinaryId: result.public_id,
    });
  } else {
    service = await Service.create({
      name,
      description,
    });
  }

  await Salon.findByIdAndUpdate(salonId, {
    $push: { service: service._id },
  });

  res.status(200).json({
    status: "success",
    service,
  });
});

exports.editService = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const serviceId = req.params.id;

  const salonId = req.user.salonCreated;

  if (!salonId) {
    return next(new AppError("You don't have a consultation profile", 400));
  }

  const salon = await Salon.findById(salonId);

  if (!salon.service.find((e) => e._id.toString() === serviceId)) {
    return next(new AppError("You don't have this service", 400));
  }

  const { name, description } = req.body;

  const service = await Service.findById(serviceId);

  if (!service) {
    return next(new AppError("You don't have this service", 400));
  }

  const updatedService = await Service.findOneAndUpdate(
    {
      _id: serviceId,
    },
    {
      name,
      description,
    },
    {
      new: true, // Return the updated object
    }
  );

  res.status(200).json({
    status: "success",
    updatedService,
  });
});

exports.addServicesPhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
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
  try {
    const serviceId = req.params.id;

    const salonId = req.user.salonCreated;

    if (!salonId) {
      return next(new AppError("You don't have a consultation profile", 400));
    }

    const salon = await Salon.findById(salonId);

    if (!salon.service.find((e) => e._id.toString() === serviceId)) {
      return next(new AppError("You don't have this service", 400));
    }

    const service = await Service.findById(serviceId);
    const { path } = req.file;

    const result = await cloudinary.uploader.upload(path, {
      public_id: `/${serviceId}/${service.name}Photo`,
      folder: "services",
      resource_type: "image",
    });

    const updatedService = await Service.findOneAndUpdate(
      {
        _id: serviceId,
      },
      {
        servicePhoto: result.secure_url,
        cloudinaryId: result.public_id,
      },
      {
        new: true, // Return the updated object
      }
    );

    res.status(200).json({
      status: "success",
      updatedService,
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error,
    });
  }
});

exports.deleteservicePhoto = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const serviceId = req.params.id;

  const salonId = req.user.salonCreated;

  if (!salonId) {
    return next(new AppError("You don't have a consultation profile", 400));
  }
  const salon = await Salon.findById(salonId);

  if (!salon.service.find((e) => e._id.toString() === serviceId)) {
    return next(new AppError("You don't have this service", 400));
  }

  const updateService = await Service.findByIdAndUpdate(serviceId, {
    servicePhoto: null,
    cloudinaryId: null,
  });

  res.status(200).json({
    status: "success",
    updateService,
  });
});

exports.deleteService = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  try {
    const serviceId = req.params.id;
    const userId = req.user.id;

    const salonId = req.user.salonCreated;

    if (!salonId) {
      return next(new AppError("You don't have a consultation profile", 400));
    }
    const salon = await Salon.findById(salonId);

    const service = salon.service.find((e) => e._id.equals(serviceId));

    if (!service) {
      return next(new AppError("You don't have this service", 400));
    }

    await Service.findOneAndDelete(
      {
        _id: serviceId,
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      status: "success",
      message: "Service deleted",
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error,
    });
  }
});

exports.searchSalon = factory.search(Salon);

exports.deleteSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const userId = req.user.id;
  const salonId = req.params.id;

  await Salon.findByIdAndDelete(salonId);

  await User.findByIdAndUpdate(userId, {
    $pull: { salonCreated: salonId },
  });

  res.status(200).json({
    status: "success",
    message: "Salon deleted successfully",
  });
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
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
  const salonId = req.user.salonCreated;

  if (!salonId) {
    return next(new AppError("You don't have a consultation profile", 400));
  }

  const doc = await new APIFeatures(
    SalonBooking.findOne({ salon: salonId }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .Pagination();
  const bookings = await doc.query;

  res.status(200).json({
    status: "success",
    results: bookings.length,
    bookings,
  });
});

exports.addTimeTable = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const salonId = req.user.salonCreated;

  if (!salonId) {
    return next(new AppError("You are not the owner of this salon", 400));
  }

  const { startTime, endTime, day, date } = req.body;

  const available = await SalonTimeTable.find({
    salon: salonId,
    day: day,
    date: parseDate(date),
  });

  let conflict = available.map((available) => {
    return isTimeConflict(
      available.startTime,
      available.endTime,
      startTime,
      endTime
    );
  });

  if (conflict.includes(true)) {
    return next(new AppError("Salon is already available at this time.", 400));
  }

  const newTime = await SalonTimeTable.create({
    salon: salonId,
    startTime,
    endTime,
    day,
    date,
  });

  await Salon.findOneAndUpdate(
    { _id: salonId },
    {
      $push: { availableTable: newTime._id },
    }
  );

  res.status(200).json({
    status: "success",
    newTime,
  });
});

exports.addAddress = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  /*  #swagger.description = 'This Id For salon' */
  const salonId = req.params.id;
  const {
    street,
    AdditionalDirection,
    houseNo,
    latitude,
    longitude,
    houseType,
    phone,
    area,
  } = req.body;
  const address = await Address.create({
    street,
    houseNo,
    latitude,
    longitude,
    houseType,
    AdditionalDirection,
    phone,
    area,
  });

  await Salon.findByIdAndUpdate(
    salonId,
    {
      $push: { address: address.id },
    },
    { new: true }
  );

  res.status(201).json({
    status: "success",
    message: "Address Add successful",
  });
});

exports.updateAddress = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  /*  #swagger.description = 'This Id For address' */
  const addressId = req.params.id;
  const {
    street,
    AdditionalDirection,
    houseNo,
    latitude,
    longitude,
    houseType,
    phone,
    area,
  } = req.body;
  const updatedAddress = await Address.findOneAndUpdate(
    {
      _id: addressId,
    },
    {
      street,
      houseNo,
      latitude,
      longitude,
      houseType,
      AdditionalDirection,
      phone,
      area,
    }
  );

  res.status(201).json({
    status: "success",
    message: "Address update successful",
    updatedAddress,
  });
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  /*  #swagger.description = 'id: Salon Id , addressId: AdressId*/
  const salonId = req.params.id;
  const { addressId } = req.params;
  await Address.findByIdAndRemove(addressId);
  await Salon.findByIdAndUpdate(salonId, {
    $pull: { address: addressId },
  });

  res.status(201).json({
    status: "success",
    message: "address remove successful",
  });
});

exports.myClients = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Salon']
  const salon = await Salon.findById(req.user.salonCreated);
  const salonBookings = await Booking.find({ salon: salon._id });
  const clientsIds = salonBookings.map((e) => {
    return e.user;
  });
  const clients = await User.find({ salonBooking: { $in: clientsIds } });

  if (!salon) {
    return next(new AppError("You don't have a salon profile", 400));
  }

  res.status(200).json({
    clients,
  });
});
