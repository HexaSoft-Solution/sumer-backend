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