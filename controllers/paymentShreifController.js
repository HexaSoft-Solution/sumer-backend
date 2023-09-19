const User = require("../models/userModel");
const Product = require("../models/productModel");
const Transaction = require("../models/transactionModel");
const Invoice = require("../models/invoiceModel");
const Salon = require("../models/salonModel");
const SalonBooking = require("../models/salonBookingModel");
const Consultation = require("../models/consultationModel");
const BusinussProfile = require("../models/businessProfileModel");
const Voucher = require('../models/voucherModel');
const BusinessOrder = require('../models/businessOrderSchema');

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const moyasar = require("../utils/moyasar");
const SalonTimeTable = require("../models/salonAvailableTimeModel");

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

exports.checkout = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const cart = req.user.cart.items;
    const userId = req.user._id;

    if (cart.length === 0) {
        return next(new AppError("Cart is empty.", 400));
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

    const invoiceId = generateRandomInvoiceId();

    const invoice = new Invoice({
        invoiceId: invoiceId,
        transactions: transactionIds,
        totalAmount: totalCartAmount,
        user: userId,
    });
    await invoice.save();

    res.status(200).json({
        status: "success",
        message: "Checkout successful!",
        invoiceId: invoiceId,
        totalCartAmount: totalCartAmount,
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

        res.status(200).json({
            status: "success",
            message: "Payment successful!",
        })
    } else {
        res.status.json({
            status: "failed",
            message: "Payment failed!",
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

    salon.balance += salon.pricePerHour;
    await salon.save();

    salon.booking.push(newBooking._id);
    await salon.save();

    res.status(201).json({
        status: "Success",
        message: "Booking created successfully",
        booking: newBooking,
    });
});

exports.buyConsultantTicket = catchAsync(async (req, res, next) => {
    // #swagger.tags = ['Payment']
    const {
        consultationId, 
    } = req.body;

    const consultation = await Consultation.findById(consultationId);

    await User.findByIdAndUpdate(
        {_id: consultation.owner._id},
        {$inc: {balance: consultation.price}},
    )

    res.status(200).json({
        status: "success",
        message: "Checkout successful!",
    });
});