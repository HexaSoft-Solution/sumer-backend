const User = require("../models/userModel");
const Product = require("../models/productModel");
const Transaction = require("../models/transactionModel");
const Invoice = require("../models/invoiceModel");
const Salon = require("../models/salonModel");
const SalonBooking = require("../models/salonBookingModel");
const Consultation = require("../models/consultationModel");
const Consultant = require("../models/consultantModel");
const BusinussProfile = require("../models/businessProfileModel");
const Voucher = require('../models/voucherModel');
const CreditCard = require('../models/creditCardModel');
const PaypalSalonOrders = require('../models/paypalSalonOrdersSchema');
const PaypalConsultationOrders = require('../models/paypalConsultationOrdersSchema');
const Promotion = require('../models/promotionModel')
const BusinessOrder = require('../models/businessOrderSchema');

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const moyasar = require("../utils/moyasar");
const Paypal = require('../utils/paypal');
const SalonTimeTable = require("../models/salonAvailableTimeModel");

const paypal = require("@paypal/checkout-server-sdk");
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET_KEY;
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

const fs = require('fs');
const path = require('path');

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
            const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            return utcDate;
        }
    }
    return date;
};

const basicPayment = async (req, res, next, amount, description, source, id, reply) => {
    const payment = await moyasar.createPayment(
        amount,
        description,
        source,
        [{id: next}],
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

    const cart = user.cart.items;

    const cartDetails = [];
    let totalPrice = 0;

    for (const item of cart) {
        const product = await getProductDetails(item.product);
        let totalPriceForProduct;
        if (product.discountedPrice > 0) {
            totalPriceForProduct = product.discountedPrice * item.quantity;
            totalPrice += totalPriceForProduct;
        } else {
            totalPriceForProduct = product.price * item.quantity;
            totalPrice += totalPriceForProduct;
        }

        cartDetails.push({
            cartId: item._id,
            Product: product,
            quantity: item.quantity,
            cartId: item._id,
            totalPriceForProduct: totalPriceForProduct,
        });
    }

    let voucher;
    let voucherDiscount

    if (user.cart.voucher) {
        voucher = await Voucher.findById(user.cart.voucher);

        const priceAfterDiscount = totalPrice - totalPrice * voucher.discountPercentage / 100;

        if (totalPrice - priceAfterDiscount > voucher.maxDiscount) {
            totalPrice = totalPrice - voucher.maxDiscount;
            voucherDiscount = voucher.maxDiscount
        } else {
            totalPrice = totalPrice - totalPrice * voucher.discountPercentage / 100;
            voucherDiscount = totalPrice * voucher.discountPercentage / 100
        }
    }

    res.status(200).json({
        status: "success",
        cartDetails: cartDetails,
        totalPriceForAllProducts: totalPrice,
        voucherDiscount,
        voucher,
    });
});

exports.addVoucher = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const userId = req.user.id;
    const {voucherCode} = req.body;

    const voucher = await Voucher.findOne({code: voucherCode});
    if (!voucher) {
        return next(new AppError("Voucher not found.", 404));
    }

    if (voucher.used) {
        return next(new AppError("Voucher already used.", 400));
    }

    if (voucher.owned) {
        return next(new AppError("Voucher already owned.", 400));
    }

    if (voucher.type !== "Product"){
        return next(new AppError("This voucher is not for product", 400));
    }    

    req.user.cart.voucher = voucher._id;
    await req.user.save();

    voucher.owned = true;
    voucher.user = userId;
    await voucher.save();

    await User.findOneAndUpdate(
        { _id: userId },
        {
            cart: {
                items: [],
                voucher: null,
            },
        }
    )

    res.status(200).json({
        status: "success",
        message: "Voucher added successfully.",
    });
});

exports.checkout = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const cart = req.user.cart.items;
    const userId = req.user._id;
    const { paymentId, save, type, addressId, number, name, cvc, month, year } = req.body;

    if (cart.length === 0) {
        return next(new AppError("Cart is empty.", 400));
    }

    if (req.user.addresses.find((address) => address._id.toString() === addressId) === undefined) {
        return next(new AppError("Address not found.", 404));
    }

    let totalCartAmount = 0;
    const metadataArray = [];
    for (const item of cart) {
        const product = await Product.findById(item.product);
        if (product.availabilityCount < item.quantity) {
            return next(
                new AppError(`Product ${product.name} is out of stock.`, 400)
            );
        }

        let totalPriceForProduct;

        if (product.discountedPrice > 0) {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        } else {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        }

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
            status: [{
                status: "Placed",
                date: Date.now(),
            }],
            address: addressId,
            user: userId,
        });
        await transaction.save();
        transactionIds.push(transaction._id);

        const product = await Product.findById(item.product);

        await User.findOneAndUpdate(
            {_id: product.owner._id},
            {$inc: {balance: product.price}},
        )

        
    }

    if (req.user.cart.voucher) {
        const voucher = await Voucher.findById(req.user.cart.voucher);
        const priceAfterVoucher = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        if (totalCartAmount - priceAfterVoucher > voucher.maxDiscount) {
            totalCartAmount = totalCartAmount - voucher.maxDiscount;
        } else {
            totalCartAmount = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        }
        voucher.used = true;
        await voucher.save();
    }

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        console.log('\n =========================', payment, '\n =========================');
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: year,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

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
            {invoiceId: invoiceId},
            {paymentIds: paymentId},
            {new: true}
        );

        const transactionsArr = invoice.transactions;
        for (const transactionId of transactionsArr) {
            const transaction = await Transaction.findById(transactionId);
            const product = await Product.findOneAndUpdate(
                {_id: transaction.product},
                {$inc: {availabilityCount: -transaction.quantity}},
                {new: true}
            );
            await BusinussProfile.findOneAndUpdate(
                {user: product.owner},
                {
                    $inc: {balance: transaction.price},
                    $push: {Transactions: transaction.id},
                },
                {new: true}
            );
        }

        const transactions = await Transaction.find({
            _id: {$in: invoice.transactions},
        });

        let groupedTransactions = {};

        for (const transaction of transactions) {
            transaction.paymentId = paymentId;
            await transaction.save();
    
            // Assuming the transaction has a product property you can use to fetch product details
            const product = await Product.findById(transaction.product);
    
            const ownerId = String(product.owner._id);
    
            if (groupedTransactions[ownerId]) {
                groupedTransactions[ownerId].transactions.push(transaction._id);
                groupedTransactions[ownerId].total += transaction.price;
            } else {
                groupedTransactions[ownerId] = {
                    businessId: product.owner._id,
                    transactions: [transaction._id],
                    buyer: transaction.user,
                    address: transaction.address,
                    total: transaction.price
                };
            }
        }

        for (let ownerId in groupedTransactions) {
            const order = new BusinessOrder(groupedTransactions[ownerId]);
            await order.save();
        }

        const transactionsIds = invoice.transactions.map(transaction => {
            return transaction._id
        })

        await User.findOneAndUpdate(
            { _id: invoice.user.toString() },
            {
                $push: {
                    invoices: invoice._id,
                    transactions: transactionsIds
                }
            }
        )

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
});


exports.checkPayment = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
  try{
      const paymentId = req.query.id;
      const payment = await moyasar.fetchPayment(paymentId);


      if (payment.status === "paid") {

          return res.status(200).json({success: "success", status: payment.status})
      } else {
          return res.status(400).json({success: "fail", status: payment.status})
      }
  }catch(e){
          return res.status(500).json({success: "error"});
  }
});

exports.promoteProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {productId, paymentId, planId, save, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

    const promotionPlan = await Promotion.findById(planId);

    await basicPayment(req, res, promotionPlan.id, promotionPlan.price, "Promote Salon", source, productId, "promoteProduct");
})

exports.verifyPromoteProduct = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {productId, amount, planId} = req.params;
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
        const promotionPlan = await Promotion.findById(planId);

        await Product.findByIdAndUpdate(
            productId,
            {
                $inc: {promotedAds: promotionPlan.promotionPoint},
                adsExpireDate: Date.now() + promotionPlan.day,
            },
            {new: true}
        );

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
})

exports.promoteSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {salonId, paymentId, save, planId, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

    const promotionPlan = await Promotion.findById(planId);

    await basicPayment(req, res, promotionPlan.id, promotionPlan.price, "Promote Salon", source, salonId, "promoteSalon");
})

exports.verifyPromoteSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {salonId, amount, planId} = req.params;
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
        const promotionPlan = await Promotion.findById(planId);
        await Salon.findByIdAndUpdate(
            salonId,
            {
                $inc: {promotedAds: promotionPlan.promotionPoint},
                adsExpireDate: Date.now() + promotionPlan.day,
            },
            {new: true}
        );

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
})

exports.promoteConsultation = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {consultationId, paymentId, save, planId, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

    const promotionPlan = await Promotion.findById(planId);

    await basicPayment(req, res, promotionPlan.id, promotionPlan.price, "Promote Consultation", source, consultationId, "promoteConsultation");
})

exports.verifyPromoteConsultation = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {consultationId, amount, planId} = req.params;
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
        const promotionPlan = await Promotion.findById(planId);
        await Consultation.findByIdAndUpdate(
            consultationId,
            {
                $inc: {promotedAds: promotionPlan.promotionPoint},
                adsExpireDate: Date.now() + promotionPlan.day,
            },
            {new: true}
        );

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
})

exports.buyProductConnections = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {paymentId, save, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

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
                $inc: {connections: 10, productAds: 2},
            },
            {new: true}
        );

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
            }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
            }
        })
    }
});

exports.salonBooking = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {
        salonId,
        startTime,
        endTime,
        service,
        day,
        date,
        type,
        paymentId,
        save,
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

    console.log(conflicts)

    if (conflicts.length > 0) {
        return next(new AppError("Salon is already booked at this time.", 400));
    }

    const availability = await SalonTimeTable.find({
        salon: salonId,
        startTime,
        endTime,
        day,
        date: parseDate(date),
    })

    console.log(parseDate(date))

    if (availability.length === 0) {
        return next(new AppError("Salon is not available at this time.", 400));
    }

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

    const newBooking = await SalonBooking.create({
        salon: salonId,
        startTime,
        endTime,
        day,
        user: req.user.id,
        date,
        service
    });

    const startParts = startTime.split(":");
    const endParts = endTime.split(":");

    const startHours = parseInt(startParts[0], 10);
    const endHours = parseInt(endParts[0], 10);

    const payment = await moyasar.createPayment(
        (endHours - startHours) * (salon.pricePerHour || 10),
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

    salon.balance += salon.pricePerHour;
    await salon.save();

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
    const userId = req.params.user;
    const amount = req.params.amount;
    const salonId = req.params.salonId;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
        const salonBook = await SalonBooking.findByIdAndUpdate(bookingId, {paymentStatus: "Paid"});

        await Salon.findByIdAndUpdate(salonId, {
            $inc: {balance: amount},
            $push: {booking: salonBook.id}
        });

        await User.findByIdAndUpdate(userId, {
            $push: {salonBooking: salonBook.id}
        });

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
});

exports.createConsultantProfilePayment = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {paymentId, save, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

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

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
});

exports.consultationContectionsPayment = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {paymentId, save, connections, type, number, name, cvc, month, year} = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: expiryYear,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

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
                $inc: {consultantConnection: connection},
            });

            fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
        } else {
            res
                .status(400)
                .json({status: "error", message: "Payment failed or not yet paid."});
        }
    }
);

exports.buyConsultantTicket = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {
        consultationId, 
        title,
        paymentId, 
        save, 
        type, 
        number, 
        name, 
        cvc, 
        month, 
        year
    } = req.body;

    let source;

    if (paymentId) {
        const payment = await CreditCard.findById(paymentId);
        source = {
            type: "creditcard", 
            number: payment.cardNumber, 
            name: payment.name, 
            cvc: payment.cvc,
            month: payment.expiryMonth, 
            year: payment.expiryYear
        }
    } else {
        source = {type, number, name, cvc, month, year};
    }

    if (save === true) {
        const creditCard = await CreditCard.create({
            cardNumber: number,
            name,
            expiryMonth: month,
            expiryYear: year,
            cvc
        })

        req.user.creditCards.push(creditCard._id);
        await req.user.save();
    }

    const consultation = await Consultation.findById(consultationId);

    console.log(consultation.owner);

    const payment = await moyasar.createPayment(
        consultation.price,
        "Buy Consultation Ticket",
        source,
        [{title}],
        consultation.owner,
        req.user.id,
        req.protocol,
        req.get("host"),
        "buyConsultationTicket"
    );

    await User.findByIdAndUpdate(
        {_id: consultation.owner._id},
        {$inc: {balance: consultation.price}},
    )

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
    const userId = req.params.userId;
    const consult = req.params.consult;
    const title = req.params.title;

    console.log(consult, userId)

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === "paid") {
        const consultant = await Consultant.create({
            title,
            user: userId,
            consultant: consult,
        });
        
        const consultation = await Consultation.findById(consult);

        await Consultation.findByIdAndUpdate(consult, {
            $inc: { balance: consultation.price },
        });

        await User.findByIdAndUpdate(userId, {
            $push: {
                createConsultant: consult,
                consultant: consultant.id
            }
        });

        fs.readFile(path.join(__dirname, '../views/payment-success.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })

    } else {
        fs.readFile(path.join(__dirname, '../views/payment-failed.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              } else {
                // Set the Content-Type header to indicate that you're sending HTML
                res.writeHead(200, { 'Content-Type': 'text/html' });
                // Send the HTML content as the response
                res.end(data);
              }
        })
    }
});

exports.checkoutPaypal = catchAsync(async (req, res, next) => {
    const cart = req.user.cart.items;
    const userId = req.user._id;


    const { addressId } = req.body

    if (cart.length === 0) {
        return next(new AppError("Cart is empty.", 400));
    }


    if (req.user.addresses.find(address => address._id.toString() === addressId.toString())) {
        return next(new AppError("Address not found.", 400));
    }

    let totalCartAmount = 0;
    const metadataArray = [];
    for (const item of cart) {
        const product = await Product.findById(item.product);
        if (product.availabilityCount < item.quantity) {
            return next(
                new AppError(`Product ${product.name} is out of stock.`, 400)
            );
        }

        let totalPriceForProduct;

        if (product.discountedPrice > 0) {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        } else {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        }

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
            status: [{
                status: "Placed",
            }],
            address: addressId,
            user: userId,
        });
        await transaction.save();
        transactionIds.push(transaction._id);

        const product = await Product.findById(item.product);

        await User.findByIdAndUpdate(
            {_id: product.owner._id},
            {$inc: {balance: product.price}},
        )
    }

    if (req.user.cart.voucher) {
        const voucher = await Voucher.findById(req.user.cart.voucher);
        const priceAfterVoucher = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        if (totalCartAmount - priceAfterVoucher > voucher.maxDiscount) {
            totalCartAmount = totalCartAmount - voucher.maxDiscount;
        } else {
            totalCartAmount = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        }
        voucher.used = true;
        await voucher.save();
    }

    const items = req.user.cart.items.map(item => {
        return {
            name: item.product.name,
            sku: item.product._id,
            price: item.product.price * 0.27,
            currency: "USD",
            quantity: item.quantity
        }
    })

    const amount = {
        currency: "USD",
        total: totalCartAmount * 0.27
    }

    const create_payment_json = {
        intent: "sale",
        payer: {
            payment_method: "paypal",
        },
        redirect_urls: {
            return_url: `${req.protocol}://${req.get("host")}/api/v1/payment/paypal/success`,
            cancel_url: `${req.protocol}://${req.get("host")}/api/v1/products`,
        },
        transactions: [
            {
                item_list: {
                    items: items,
                },
                amount: amount,
                description: "All products Checkout",
            },
        ],
    };

    Paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response)
            return next(new AppError(error.response.message, error.response.httpStatusCode));
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === "approval_url") {
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

exports.paypalCheckoutOrder = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const cart = req.user.cart.items;
    const userId = req.user._id;

    const { addressId } = req.body

    if (cart.length === 0) {
        return next(new AppError("Cart is empty.", 400));
    }

    if (req.user.addresses.find(address => address._id.toString() === addressId.toString())) {
        return next(new AppError("Address not found.", 400));
    }

    let totalCartAmount = 0;
    const metadataArray = [];
    for (const item of cart) {
        const product = await Product.findById(item.product);
        if (product.availabilityCount < item.quantity) {
            return next(
                new AppError(`Product ${product.name} is out of stock.`, 300)
            );
        }

        let totalPriceForProduct;

        if (product.discountedPrice > 0) {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        } else {
            totalPriceForProduct = product.price * item.quantity;
            totalCartAmount += totalPriceForProduct;
        }

        const metadata = {
            name: product.name,
            description: product.desc,
            quantity: item.quantity,
            unit_amount: {
                currency_code: 'USD',
                value: (product.price * 0.24).toString(),
            }
        };
        metadataArray.push(metadata);
    }

    const transactionIds = [];
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const transaction = new Transaction({
            product: item.product,
            quantity: item.quantity,
            price: metadataArray[i].unit_amount.value * (100/24),
            status: [{
                status: "Placed",
                date: Date.now(),
            }],
            address: addressId,
            user: userId,
        });
        await transaction.save();
        transactionIds.push(transaction._id);

        const product = await Product.findById(item.product);

        await User.findByIdAndUpdate(
            {_id: product.owner._id},
            {$inc: {balance: product.price}},
        )
    }

    if (req.user.cart.voucher) {
        const voucher = await Voucher.findById(req.user.cart.voucher);
        const priceAfterVoucher = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        if (totalCartAmount - priceAfterVoucher > voucher.maxDiscount) {
            totalCartAmount = totalCartAmount - voucher.maxDiscount;
        } else {
            totalCartAmount = totalCartAmount - totalCartAmount * voucher.discountPercentage / 100;
        }
        voucher.used = true;
        await voucher.save();
    }

    const paypalItems = metadataArray;
    console.log(metadataArray)

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: "Products",
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: "Products",
            soft_descriptor: "Products",
            amount: {
                currency_code: "USD",
                value: (totalCartAmount * 0.24).toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: (totalCartAmount * 0.24).toString()
                    },
                },
            },
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
        console.log(`Response: ${JSON.stringify(response)}`);
        const orderID = response.result.id;
        console.log(`Order:    ${JSON.stringify(response.result)}`);
        const resJson = {
            orderID
        };
        const invoiceId = generateRandomInvoiceId();
        const invoice = new Invoice({
            invoiceId: invoiceId,
            transactions: transactionIds,
            totalAmount: totalCartAmount,
            user: userId,
            paypalId: orderID,
        });
        await invoice.save();
        req.user.cart.items = [];
        req.user.cart.voucher = null;
        await req.user.save();
        res.status(200).json(resJson);
});

exports.getOrderStatus = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        console.log(response.result)
        if (orderStatus === 'COMPLETED') {


        const invoice = await Invoice.findOne(
            {paypalId: orderID},
        );

        const transactionsArr = invoice.transactions;
        for (const transactionId of transactionsArr) {
            const transaction = await Transaction.findById(transactionId);
            const product = await Product.findOneAndUpdate(
                {_id: transaction.product},
                {$inc: {availabilityCount: -transaction.quantity}},
                {new: true}
            );
            await BusinussProfile.findOneAndUpdate(
                {user: product.owner},
                {
                    $inc: {balance: transaction.price},
                    $push: {Transactions: transaction.id},
                },
                {new: true}
            );
        }

        const transactions = await Transaction.find({
            _id: {$in: invoice.transactions},
        });
        let groupedTransactions = {};

        for (const transaction of transactions) {
            transaction.paymentId = paymentId;
            await transaction.save();
    
            // Assuming the transaction has a product property you can use to fetch product details
            const product = await Product.findById(transaction.product);
    
            const ownerId = String(product.owner._id);
    
            if (groupedTransactions[ownerId]) {
                groupedTransactions[ownerId].transactions.push(transaction._id);
                groupedTransactions[ownerId].total += transaction.price;
            } else {
                groupedTransactions[ownerId] = {
                    businessId: product.owner._id,
                    transactions: [transaction._id],
                    buyer: transaction.user,
                    address: transaction.address,
                    total: transaction.price
                };
            }
        }

        for (let ownerId in groupedTransactions) {
            const order = new BusinessOrder(groupedTransactions[ownerId]);
            await order.save();
        }


            await User.findOneAndUpdate(
            { id: invoice.user },
            {
                $push: {
                    invoices: invoice.id,
                    transactions: invoice.transactions
                },
                $set: {
                    'cart.items': [] // This will clear the cart items
                }
            }
        )

            return res.json({ status: 'completed' });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
})

exports.paypalBookSalon = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {
        salonId,
        startTime,
        endTime,
        service,
        day,
        date,
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

    console.log(conflicts)

    if (conflicts.length > 0) {
        return next(new AppError("Salon is already booked at this time.", 400));
    }

    const availability = await SalonTimeTable.find({
        salon: salonId,
        startTime,
        endTime,
        day,
        date: parseDate(date),
    })

    console.log(parseDate(date))

    if (availability.length === 0) {
        return next(new AppError("Salon is not available at this time.", 400));
    }

    const newBooking = await SalonBooking.create({
        salon: salonId,
        startTime,
        endTime,
        day,
        user: req.user.id,
        date,
        service
    });

    const startParts = startTime.split(":");
    const endParts = endTime.split(":");

    const startHours = parseInt(startParts[0], 10);
    const endHours = parseInt(endParts[0], 10);

    const metadata = [{
        name: salon.name,
        description: salon.about || "",
        quantity: "1",
        unit_amount: {
            currency_code: 'USD',
            value: (endHours - startHours) * (salon.pricePerHour || 10),
        }
    }]

    const paypalItems = metadata;
    console.log(metadata)

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    const exactValue = (endHours - startHours) * (salon.pricePerHour || 10)

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: "Salon",
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: "Salon",
            soft_descriptor: "Salon",
            amount: {
                currency_code: "USD",
                value: exactValue.toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: exactValue.toString()
                    },
                },
            },
        
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
    console.log(`Response: ${JSON.stringify(response)}`);
    const orderID = response.result.id;
    console.log(`Order:    ${JSON.stringify(response.result)}`);
    const resJson = {
        orderID
    };

    await PaypalSalonOrders.create({
        orderID,
        userId: req.user.id,
        bookingId: newBooking.id,
        salonId: salon._id.toString(),
        totalAmount: exactValue.toString()
    })
    
    salon.balance += salon.pricePerHour;
    await salon.save();

    salon.booking.push(newBooking._id);
    await salon.save();

    await req.user.save();
    res.status(200).json(resJson);
});

exports.getPaypalSalonBookingStatus = catchAsync(async (req, res, next) => {

    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        console.log(response.result.amount)
        if (orderStatus === 'COMPLETED') {
            const PaypalOrder = await PaypalSalonOrders.findOne({ orderID })
            const bookingId = PaypalOrder.bookingId;
            const userId = PaypalOrder.userId;
            const amount = PaypalOrder.totalAmount;
            const salonId = PaypalOrder.salonId;

            console.log(bookingId, userId, amount, salonId)

            const salonBook = await SalonBooking.findByIdAndUpdate(bookingId, {paymentStatus: "Paid"});

            await Salon.findByIdAndUpdate(salonId, {
                $inc: {balance: amount},
                $push: {booking: salonBook.id}
            });

            await User.findByIdAndUpdate(userId, {
                $push: {salonBooking: salonBook.id}
            });

            return res.json({ status: 'completed' });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
});

exports.paypalConsultationBook = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {
        consultationId, 
        title,
    } = req.body;

    const consultation = await Consultation.findById(consultationId);

    const paypalItems = [{
        name: title || "Consultation",
        description: consultation.about || "",
        quantity: "1",
        unit_amount: {
            currency_code: 'USD',
            value: consultation.price.toString(),
        }
    }]

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: "Consultation",
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: "Consultation",
            soft_descriptor: "Consultation",
            
            amount: {
                currency_code: "USD",
                value: consultation.price.toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: consultation.price.toString()
                    },
                },
            },
        
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
    console.log(`Response: ${JSON.stringify(response)}`);
    const orderID = response.result.id;
    console.log(`Order:    ${JSON.stringify(response.result)}`);
    const resJson = {
        orderID
    };

    await PaypalConsultationOrders.create({
        orderID,
        userId: req.user.id,
        consultationId: consultation.id,
        totalAmount: consultation.price.toString(),
        title
    });

    res.status(200).json(resJson);
});

exports.getPaypalConsultationBookingStatus = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        console.log(response.result.amount)
        if (orderStatus === 'COMPLETED') {
            const PaypalOrder = await PaypalConsultationOrders.findOne({ orderID })
            const consultationId = PaypalOrder.consultationId;
            const userId = PaypalOrder.userId;
            const amount = PaypalOrder.totalAmount;
            const title = PaypalOrder.title;

            const consultant = await Consultant.create({
                title,
                user: userId,
                consultant: consultationId,
            });

            await Consultation.findByIdAndUpdate(consultationId, {
                $inc: { balance: amount },
            });
    
            await User.findByIdAndUpdate(userId, {
                $push: {
                    createConsultant: consultationId,
                    consultant: consultant.id
                }
            });

            return res.json({ 
                status: 'completed',
                consultant
            });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
});

exports.promoteProductPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const { productId, planId } = req.body;

    const product = await Product.findById(productId)
    const promotionPlan = await Promotion.findById(planId);

    const metadata = [{
        name: `promot product: ${product.name}`,
        description: "promot product",
        quantity: "1",
        unit_amount: {
            currency_code: 'USD',
            value: promotionPlan.price.toString(),
        }
    }]

    const paypalItems = metadata;
    console.log(metadata)

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    const ids =  {
        productId: product.id.toString(),
        planId: promotionPlan.id.toString()
    }

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: `promot product: ${product.name}`,
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: JSON.stringify(ids),
            soft_descriptor: "promot produc",
            amount: {
                currency_code: "USD",
                value: promotionPlan.price.toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: promotionPlan.price.toString()
                    },
                },
            },
        
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
    const orderID = response.result.id;
    const resJson = {
        orderID
    };

    res.status(200).json(resJson);
});

exports.promoteProductCheckStatusPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        if (orderStatus === 'COMPLETED') {
            const { productId, planId } = JSON.parse(response.result.purchase_units[0].description)
            
            const promotionPlan = await Promotion.findById(planId);
            await Product.findByIdAndUpdate(
                productId,
                {
                    $inc: {promotedAds: promotionPlan.promotionPoint},
                    adsExpireDate: Date.now() + promotionPlan.day,
                },
                {new: true}
            );

            return res.json({ status: 'completed' });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
})

exports.promoteSalonPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const { salonId, planId } = req.body;

    const salon = await Salon.findById(salonId)
    const promotionPlan = await Promotion.findById(planId);

    const metadata = [{
        name: `promot salon: ${salon.name}`,
        description: "promot salon",
        quantity: "1",
        unit_amount: {
            currency_code: 'USD',
            value: promotionPlan.price.toString(),
        }
    }]

    const paypalItems = metadata;
    console.log(metadata)

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    const ids =  {
        salonId: salon.id.toString(),
        planId: promotionPlan.id.toString()
    }

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: `promot salon: ${salon.name}`,
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: JSON.stringify(ids),
            soft_descriptor: "promot salon",
            amount: {
                currency_code: "USD",
                value: promotionPlan.price.toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: promotionPlan.price.toString()
                    },
                },
            },
        
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
    const orderID = response.result.id;
    const resJson = {
        orderID
    };

    res.status(200).json(resJson);
});

exports.promoteSalonCheckStatusPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        if (orderStatus === 'COMPLETED') {
            const { salonId, planId } = JSON.parse(response.result.purchase_units[0].description)
            
            const promotionPlan = await Promotion.findById(planId);
            await Salon.findByIdAndUpdate(
                salonId,
                {
                    $inc: {promotedAds: promotionPlan.promotionPoint},
                    adsExpireDate: Date.now() + promotionPlan.day,
                },
                {new: true}
            );

            return res.json({ status: 'completed' });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
})

exports.promoteConsultationPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const { consultationId, planId } = req.body;

    const consultation = await Consultation.findById(consultationId)
    const promotionPlan = await Promotion.findById(planId);

    const metadata = [{
        name: `promot consultation: ${consultation.name}`,
        description: "promot consultation",
        quantity: "1",
        unit_amount: {
            currency_code: 'USD',
            value: promotionPlan.price.toString(),
        }
    }]

    const paypalItems = metadata;
    console.log(metadata)

    let request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    const ids =  {
        consultationId: consultation.id.toString(),
        planId: promotionPlan.id.toString()
    }

    request.requestBody({
        intent: "CAPTURE",
        application_context: {
            brand_name: `promot consultation: ${consultation.name}`,
            landing_page: "BILLING",
            user_action: "CONTINUE",
        },
        purchase_units: [{
            reference_id: "PUHF",
            description: JSON.stringify(ids),
            soft_descriptor: "promot consultation",
            amount: {
                currency_code: "USD",
                value: promotionPlan.price.toString(), 
                breakdown: {
                    item_total: {
                        currency_code: "USD",
                        value: promotionPlan.price.toString()
                    },
                },
            },
        
            items: paypalItems,
        },],
    });

    const response = await client.execute(request);
    const orderID = response.result.id;
    const resJson = {
        orderID
    };

    res.status(200).json(resJson);
});

exports.promoteConsultationCheckStatusPaypal = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    try {
        const orderID = req.params.orderID; // Get the order ID from the request params
        // Create a request to get order details
        let request = new paypal.orders.OrdersGetRequest(orderID);

        // Execute the request
        const response = await client.execute(request);

        // Check the order status in the response
        const orderStatus = response.result.status;

        if (orderStatus === 'COMPLETED') {
            const { consultationId, planId } = JSON.parse(response.result.purchase_units[0].description)
            
            const promotionPlan = await Promotion.findById(planId);
            await Consultation.findByIdAndUpdate(
                consultationId,
                {
                    $inc: {promotedAds: promotionPlan.promotionPoint},
                    adsExpireDate: Date.now() + promotionPlan.day,
                },
                {new: true}
            );

            return res.json({ status: 'completed' });
        } else {
            // Order is not completed or has another status
            return res.status(400).json({ status: 'not completed' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json(err);
    }
})