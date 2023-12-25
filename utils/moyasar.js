const axios = require("axios");
const createPayment = async (amount, description, source, metadata, invoiceId, user, http, url, type) => {
    try {
        let callback;
        if (type === "buyProduct") {
            callback = `${http}://${url}/api/v1/payment/paymentCallback/${invoiceId}`
        } else if (type === "buyProductConnections"){
            callback = `${http}://${url}/api/v1/payment/paymentConnection/${user}`
        } else if (type === "bookSalon") {
            callback = `${http}://${url}/api/v1/payment/verifyPaymentSalon/${invoiceId}/${amount}/${metadata[0].salon}/${user}`
        } else if (type === "createSalonProfile"){
            callback = `${http}://${url}/api/v1/payment/verifyPaymentCreateConsultation/${user}`
        } else if (type === "buyConsultationConnection") {
            callback = `${http}://${url}/api/v1/payment/verifyPaymentConsultationConnection/${invoiceId}/${user}/${metadata[0].title}`
        } else if (type === "buyConsultationTicket") {
            callback = `${http}://${url}/api/v1/payment/verify-buying-consultation-ticket/${user}/${invoiceId}/${metadata[0].title}`
        } else if (type === 'promoteProduct'){
            callback = `${http}://${url}/api/v1/payment/verify-promoting-product/${invoiceId}/${amount}/${metadata[0].id}`
        } else if (type === 'promoteSalon'){
            callback = `${http}://${url}/api/v1/payment/verify-promoting-salon/${invoiceId}/${amount}/${metadata[0].id}`
        } else if (type === 'promoteConsultation'){
            callback = `${http}://${url}/api/v1/payment/verify-promoting-consultation/${invoiceId}/${amount}/${metadata[0].id}`
        }
        const response = await axios.post(
            'https://api.moyasar.com/v1/payments',
            {
                amount: amount  * 100,
                description: description,
                source: source,
                metadata: metadata,
                callback_url: callback,
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${process.env.PAYMENT_SECRET_KEY}:`).toString('base64')}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
}

const fetchPayment = async (paymentId) => {
    try {
        const response = await axios.get(
            `https://api.moyasar.com/v1/payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${process.env.PAYMENT_SECRET_KEY}:`).toString('base64')}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error fetching payment:', error.response.data);
        throw error;
    }
}


module.exports = { createPayment, fetchPayment };