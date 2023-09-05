const User = require("../models/userModel");
const Product = require("../models/productModel");
const Transaction = require("../models/transactionModel");
const Invoice = require("../models/invoiceModel");
const Salon = require("../models/salonModel");
const SalonBooking = require("../models/salonBookingModel");
const Consultation = require("../models/consultationModel");
const Consultant = require("../models/consultantModel");
const BusinussProfile = require("../models/businessProfileModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const moyasar = require("../utils/moyasar");
const Paypal = require('../utils/paypal');
const SalonTimeTable = require("../models/salonAvailableTimeModel");

const getProductDetails = async (productId) => {
  return await Product.findById(productId);
};

const generateRandomInvoiceId = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

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

const basicPayment = async (req, res, next, amount, description, source, id, reply) => {
  const payment = await moyasar.createPayment(
      amount,
      description,
      source,
      [],
      id,
      req.user.id,
      req.protocol,
      req.get("host"),
      reply
  );

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
}

exports.viewCart = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const userId = req.user.id;

  const user = await User.findById(userId);

  const cart = user.cart;

  const cartDetails = [];
  let totalPrice = 0;

  for (const item of cart) {
    const product = await getProductDetails(item.product);
    const totalPriceForProduct = product.price * item.quantity;
    totalPrice += totalPriceForProduct;

    cartDetails.push({
      Product: product,
      quantity: item.quantity,
      totalPriceForProduct: totalPriceForProduct,
    });
  }

  res.status(200).json({
    status: "success",
    cartDetails: cartDetails,
    totalPriceForAllProducts: totalPrice,
  });
});

exports.checkout = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const cart = req.user.cart;
  const userId = req.user._id;

  let totalCartAmount = 0;
  const metadataArray = [];
  for (const item of cart) {
    const product = await Product.findById(item.product);
    if (product.availabilityCount < item.quantity) {
      return next(
        new AppError(`Product ${product.name} is out of stock.`, 400)
      );
    }
    const totalPriceForProduct = product.price * item.quantity;
    totalCartAmount += totalPriceForProduct;

    const metadata = {
      productName: product.name,
      quantity: item.quantity,
      price: product.price,
    };
    metadataArray.push(metadata);
  }

  const transactionIds = [];
  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    const transaction = new Transaction({
      product: item.product,
      quantity: item.quantity,
      price: metadataArray[i].price,
      user: userId,
    });
    await transaction.save();
    transactionIds.push(transaction._id);
  }

  const { type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  const invoiceId = generateRandomInvoiceId();
  const payment = await moyasar.createPayment(
    totalCartAmount,
    "Cart payment",
    source,
    metadataArray,
    invoiceId,
    "",
    req.protocol,
    req.get("host"),
    "buyProduct"
  );

  const invoice = new Invoice({
    invoiceId: invoiceId,
    transactions: transactionIds,
    totalAmount: totalCartAmount,
    user: userId,
    paymentIds: [payment.id],
  });
  await invoice.save();

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    invoiceId: invoiceId,
    totalCartAmount: totalCartAmount,
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.paymentCallback = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const paymentId = req.query.id;
  const payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    const invoiceId = req.params.invoice_id;

    const invoice = await Invoice.findOneAndUpdate(
      { invoiceId: invoiceId },
      { paymentIds: paymentId },
      { new: true }
    );

    const transactionsArr = invoice.transactions;
    for (const transactionId of transactionsArr) {
      const transaction = await Transaction.findById(transactionId);
      const product = await Product.findOneAndUpdate(
        { _id: transaction.product },
        { $inc: { availabilityCount: -transaction.quantity } },
        { new: true }
      );
      await BusinussProfile.findOneAndUpdate(
        { user: product.owner },
        {
          $inc: { balance: transaction.price },
          $push: { Transactions: transaction.id },
        },
        { new: true }
      );
    }

    const transactions = await Transaction.find({
      _id: { $in: invoice.transactions },
    });
    for (const transaction of transactions) {
      transaction.paymentId = paymentId;
      await transaction.save();
    }

    res
      .status(200)
      .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Payment failed or not yet paid." });
  }
});

exports.promoteProduct = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { productId, promote, type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  await basicPayment(req, res, next, promote * 10, "Promote Salon", source, productId, "promoteProduct");
})

exports.verifyPromoteProduct = catchAsync(async (req, res, next) => {
  const { productId, amount } = req.params;
  const paymentId = req.query.id;
  const payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await Product.findByIdAndUpdate(
        productId,
        {
          $inc: { promotedAds: amount },
        },
        { new: true }
    );

    res
        .status(200)
        .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
        .status(400)
        .json({ status: "error", message: "Payment failed or not yet paid." });
  }
})

exports.promoteSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { salonId, promote, type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  await basicPayment(req, res, next, promote * 10, "Promote Salon", source, salonId, "promoteSalon");
})

exports.verifyPromoteSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { salonId, amount } = req.params;
  const paymentId = req.query.id;
  const payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await Salon.findByIdAndUpdate(
        salonId,
        {
          $inc: { promotedAds: amount },
        },
        { new: true }
    );

    res
        .status(200)
        .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
        .status(400)
        .json({ status: "error", message: "Payment failed or not yet paid." });
  }
})

exports.promoteConsultation = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { consultationId, promote, type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  await basicPayment(req, res, next, promote * 10, "Promote Consultation", source, consultationId, "promoteConsultation");
})

exports.verifyPromoteConsultation = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { consultationId, amount } = req.params;
  const paymentId = req.query.id;
  const payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await Consultation.findByIdAndUpdate(
        consultationId,
        {
          $inc: { promotedAds: amount },
        },
        { new: true }
    );

    res
        .status(200)
        .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
        .status(400)
        .json({ status: "error", message: "Payment failed or not yet paid." });
  }
})

exports.buyProductConnections = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  const payment = await moyasar.createPayment(
    40,
    "Buy Product Connections",
    source,
    [],
    "0",
    req.user.id,
    req.protocol,
    req.get("host"),
    "buyProductConnections"
  );

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.verifyBuyConnection = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const userId = req.params.user;
  const paymentId = req.query.id;
  const payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { connections: 10, productAds: 2 },
      },
      { new: true }
    );

    res
      .status(200)
      .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Payment failed or not yet paid." });
  }
});

exports.salonBooking = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const {
    salonId,
    startTime,
    endTime,
    day,
    date,
    type,
    number,
    name,
    cvc,
    month,
    year,
  } = req.body;

  const salon = await Salon.findById(salonId);
  if (!salon) {
    return next(new AppError("Salon not found.", 404));
  }

  const bookings = await SalonBooking.find({
    salon: salonId,
    day: day,
    date: parseDate(date),
  });

  const newBookingCheck = {
    startTime: startTime,
    endTime: endTime,
    day: day,
    date: parseDate(date),
  };

  const conflicts = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date);
    const newBookingDate = new Date(newBookingCheck.date);

    if (booking.day === newBookingCheck.day && bookingDate.getTime() === newBookingDate.getTime()) {
      const bookingStartTime = new Date(`1970-01-01T${booking.startTime}:00`);
      const bookingEndTime = new Date(`1970-01-01T${booking.endTime}:00`);
      const newBookingStartTime = new Date(`1970-01-01T${newBookingCheck.startTime}:00`);
      const newBookingEndTime = new Date(`1970-01-01T${newBookingCheck.endTime}:00`);

      if (
          (newBookingStartTime >= bookingStartTime && newBookingStartTime < bookingEndTime) ||
          (newBookingEndTime > bookingStartTime && newBookingEndTime <= bookingEndTime) ||
          (newBookingStartTime <= bookingStartTime && newBookingEndTime >= bookingEndTime)
      ) {
        return true;
      }
    }

    return false;
  });


  if (conflicts.length > 0) {
    return next(new AppError("Salon is already booked at this time.", 400));
  }

  const availability = await SalonTimeTable.find({
    salon: salonId,
    startTime,
    endTime,
    day,
    date,
  })

  console.log(availability)

  if (availability.length === 0) {
    return next(new AppError("Salon is not available at this time.", 400));
  }

  const source = { type, number, name, cvc, month, year };
  const newBooking = await SalonBooking.create({
    salon: salonId,
    startTime,
    endTime,
    day,
    date,
  });

  const startParts = startTime.split(":");
  const endParts = endTime.split(":");

  const startHours = parseInt(startParts[0], 10);
  const endHours = parseInt(endParts[0], 10);

  const payment = await moyasar.createPayment(
    (endHours - startHours) * salon.pricePerHour,
    "Book Salon",
    source,
    [{salon: salon._id.toString()}],
    newBooking.id,
    req.user.id,
    req.protocol,
    req.get("host"),
    "bookSalon"
  );

  if (!payment) {
    return next(new AppError("Payment failed.", 400));
  }

  salon.booking.push(newBooking._id);
  await salon.save();

  res.status(201).json({
    status: "Success",
    message: "Booking created successfully",
    booking: newBooking,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.verifyBookingSalon = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const paymentId = req.query.id;
  const bookingId = req.params.bookingId;
  const amount = req.params.amount;
  const salonId = req.params.salonId;

  let payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    const salonBook = await SalonBooking.findByIdAndUpdate(bookingId, { paymentStatus: "Paid" });

    await Salon.findByIdAndUpdate(salonId, {
      $inc: { balance: amount },
      $push: { booking: salonBook.id }
    });

    res
      .status(200)
      .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Payment failed or not yet paid." });
  }
});

exports.createConsultantProfilePayment = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  const payment = await moyasar.createPayment(
    40,
    "Create Consultation Profile",
    source,
    [],
    "0",
    req.user.id,
    req.protocol,
    req.get("host"),
    "createSalonProfile"
  );

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.verifyCreateConsultationProfile = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const paymentId = req.query.id;
  const userId = req.params.user;

  let payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await User.findByIdAndUpdate(userId, {
      createConsultation: true,
    });

    res
      .status(200)
      .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Payment failed or not yet paid." });
  }
});

exports.consultationContectionsPayment = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { connections, type, number, name, cvc, month, year } = req.body;

  const source = { type, number, name, cvc, month, year };

  const payment = await moyasar.createPayment(
    connections * 10,
    "Buy Consultation Connections",
    source,
    [],
    connections,
    req.user.id,
    req.protocol,
    req.get("host"),
    "buyConsultationConnection"
  );

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.verifyBuyingConsultationsConnection = catchAsync(
  async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const paymentId = req.query.id;
    const connection = req.params.consult;
    const userId = req.params.user;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
      await User.findByIdAndUpdate(userId, {
        $inc: { consultantConnection: connection },
      });

      res
        .status(200)
        .json({
          status: "success",
          message: "Payment processed successfully.",
        });
    } else {
      res
        .status(400)
        .json({ status: "error", message: "Payment failed or not yet paid." });
    }
  }
);

exports.buyConsultantTicket = catchAsync(async (req, res, next) => {

  const { consultationId, type, number, name, cvc, month, year } =
    req.body;

  const source = { type, number, name, cvc, month, year };

  const consultation = await Consultation.findById(consultationId);

  console.log(consultation.owner);

  const payment = await moyasar.createPayment(
    consultation.price,
    "Buy Consultation Ticket",
    source,
    [],
    consultation.id,
    req.user.id,
    req.protocol,
    req.get("host"),
    "buyConsultationTicket"
  );

  res.status(200).json({
    status: "success",
    message: "Checkout successful!",
    paymentId: payment.id,
    callback_url: payment.callback_url,
    payment: payment.source.transaction_url,
  });
});

exports.verifyBuyingConsultationsTicket = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  /*
  #swagger.parameters['user'] = {
    in: 'query',
    type: 'string',
    required: true,
    description: 'ID of the user'
  }
  #swagger.parameters['id'] = {
    in: 'query',
    type: 'string',
    required: true,
    description: 'ID of the payment'
  }
  #swagger.responses[200] = {
    description: 'Payment processed successfully',
    schema: {
      status: 'success',
      message: 'Payment processed successfully.'
    }
  }
  #swagger.responses[400] = {
    description: 'Payment failed or not yet paid',
    schema: {
      status: 'error',
      message: 'Payment failed or not yet paid.'
    }
  }
*/
  const paymentId = req.query.id;
  const userId = req.params.user;
  const consult = req.params.consult;

  let payment = await moyasar.fetchPayment(paymentId);

  if (payment.status === "paid") {
    await User.findByIdAndUpdate(userId, {
      $push: { createConsultant: consult }
    });

    res
      .status(200)
      .json({ status: "success", message: "Payment processed successfully." });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Payment failed or not yet paid." });
  }
});

exports.paypal = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const response = await Paypal.createOrder();
  res.json(response);
})

exports.complete = catchAsync(async (req, res, next) => {
  // #swagger.tags = ['Payment']
  const { orderID } = req.params;
  const response = await Paypal.capturePayment(orderID);
  res.json(response);
})