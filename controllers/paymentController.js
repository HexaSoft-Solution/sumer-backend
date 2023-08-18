const User = require('../models/userModel');
const Product = require('../models/productModel');
const Transaction = require('../models/transactionModel');
const Invoice = require('../models/invoiceModel');
const Salon = require('../models/salonModel');
const SalonBooking = require('../models/salonBookingModel');
const Consultation = require('../models/consultationModel');
const Consultant = require('../models/consultantModel')

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const moyasar = require('../utils/moyasar');


const getProductDetails = async (productId) => {
    return await Product.findById(productId);
};

const generateRandomInvoiceId = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};

const parseDate = (date) => {
    if (typeof date === 'string') {
        const parts = date.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    return date;
}

exports.viewCart = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const user = await User.findById(userId)

    const cart = user.cart

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
        status: 'success',
        cartDetails: cartDetails,
        totalPriceForAllProducts: totalPrice,
    });
})

exports.checkout = catchAsync(async (req, res, next) => {
    const cart = req.user.cart;
    const userId = req.user._id;

    let totalCartAmount = 0;
    const metadataArray = [];
    for (const item of cart) {
        const product = await Product.findById(item.product);
        if (product.availabilityCount < item.quantity) {
            return next(new AppError(`Product ${product.name} is out of stock.`, 400));
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

    const {
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const invoiceId = generateRandomInvoiceId();
    const payment = await moyasar.createPayment(totalCartAmount, 'Cart payment', source, metadataArray, invoiceId, req.protocol, req.get('host'), "buyProduct");

    const invoice = new Invoice({
        invoiceId: invoiceId,
        transactions: transactionIds,
        totalAmount: totalCartAmount,
        user: userId,
        paymentIds: [payment.id],
    });
    await invoice.save();

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        invoiceId: invoiceId,
        totalCartAmount: totalCartAmount,
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
});

exports.paymentCallback = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        const invoiceId = req.params.invoice_id;

        const invoice = await Invoice.findOneAndUpdate(
            {invoiceId: invoiceId},
            {paymentIds: paymentId},
            {new: true}
        );

        const transactionsArr = invoice.transactions
        for (const transactionId of transactionsArr) {
            const transaction = await Transaction.findById(transactionId);
            await Product.findOneAndUpdate({ _id: transaction.product }, { $inc: { availabilityCount: -transaction.quantity } }, { new: true })
        }

        const transactions = await Transaction.find({_id: {$in: invoice.transactions}});
        for (const transaction of transactions) {
            transaction.paymentId = paymentId;
            await transaction.save();
        }

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
});

exports.buyProductConnections = catchAsync(async (req, res, next) => {
    const {
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const payment = await moyasar.createPayment(40, 'Buy Product Connections', source, [], "0", req.protocol, req.get('host'), "buyProductConnections");

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
});

exports.verifyBuyConnection = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const paymentId = req.query.id;
    const payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        await User.findByIdAndUpdate(userId,
            {
                $inc: { connections: 10, productAds: 2 },
            }, { new: true }
        );

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
});

exports.salonBooking = catchAsync(async (req, res, next) => {
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
        return next(new AppError('Salon not found.', 404));
    }

    const bookings = await SalonBooking.find({
        salon: salonId,
        day: day,
        date: parseDate(date)
    });

    let conflict = bookings.map(booking => {
        if (booking.day === day && booking.salon === salonId) {
            if (booking.startTime <= startTime && booking.endTime >= startTime) {
                return true;
            }
            if (booking.startTime <= endTime && booking.endTime >= endTime) {
                return true;
            }
            if (booking.startTime >= startTime && booking.endTime <= endTime) {
                return true;
            }
        }
    });

    if(bookings.length === 0)
        conflict = false;

    if(conflict) {
        return next(new AppError('Salon is already booked at this time.', 400));
    }

    const source = { type, number, name, cvc, month, year };
    const newBooking = await SalonBooking.create({
        salon: salonId,
        startTime,
        endTime,
        day,
        date,
    });

    const startParts = startTime.split(':');
    const endParts = endTime.split(':');

    const startHours = parseInt(startParts[0], 10);
    const endHours = parseInt(endParts[0], 10);

    const payment = await moyasar.createPayment((endHours - startHours) * salon.pricePerHour, 'Book Salon', source, [], newBooking.id, req.protocol, req.get('host'), "bookSalon");

    if(!payment) {
        return next(new AppError('Payment failed.', 400));
    }


    salon.booking.push(newBooking._id);
    await salon.save();

    res.status(201).json({
        status: "Success",
        message: 'Booking created successfully',
        booking: newBooking,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
})

exports.verifyBookingSalon = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const bookingId = req.params.bookingId;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        await SalonBooking.findByIdAndUpdate(bookingId,
            { paymentStatus: "Paid" }
        );

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
});

exports.createConsultantProfilePayment = catchAsync(async (req, res, next) => {
    const {
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const payment = await moyasar.createPayment(40, 'Create Consultation Profile', source, [], "0", req.protocol, req.get('host'), "createSalonProfile");

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
})

exports.verifyCreateConsultationProfile = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const userId = req.user.id;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        await User.findByIdAndUpdate(userId, {
            createConsultation: true
        })

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
})

exports.consultationContectionsPayment = catchAsync(async (req, res, next) => {
    const {
        connections,
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const payment = await moyasar.createPayment(connections * 10, 'Buy Consultation Connections', source, [], connections, req.protocol, req.get('host'), "buyConsultationConnection");

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
})

exports.verifyBuyingConsultationsConnection = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const connection = req.params.id
    const userId = req.user.id;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        await User.findByIdAndUpdate(userId, {
            "$inc": { "consultantConnection": connection }
        })

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
})

exports.buyConsultantTicket = catchAsync(async (req, res, next) => {
    const {
        consultationId,
        type,
        number,
        name,
        cvc,
        month,
        year,
    } = req.body;

    const source = { type, number, name, cvc, month, year };

    const consultation = await Consultation.findById(consultationId);


    console.log(consultation.owner)

    const payment = await moyasar.createPayment(consultation.price, 'Buy Consultation Ticket', source, [], consultation.owner._id, req.protocol, req.get('host'), "buyConsultationTicket");

    res.status(200).json({
        status: 'success',
        message: 'Checkout successful!',
        paymentId: payment.id,
        callback_url: payment.callback_url,
        payment: payment.source.transaction_url
    });
})

exports.verifyBuyingConsultationsTicket = catchAsync(async (req, res, next) => {
    const paymentId = req.query.id;
    const consultationId = req.params.id
    const userId = req.user.id;

    let payment = await moyasar.fetchPayment(paymentId);

    if (payment.status === 'paid') {

        const consultant = await Consultant.create({
            user: userId,
            consultant: consultationId
        })

        await Consultation.findOneAndUpdate({owner: consultationId}, {
            "$push": { "consultants": consultant._id },
            "$inc": { "balance": (payment.amount) / 1000 }
        })

        res.status(200).json({status: 'success', message: 'Payment processed successfully.'});
    } else {
        res.status(400).json({ status: 'error', message: 'Payment failed or not yet paid.' });
    }
})