const {  PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY } = process.env;

const base = "https://api-m.sandbox.paypal.com";

// const get_access_token = async (client_id, client_secret, endpoint_url) => {
//     const auth = `${client_id}:${client_secret}`
//     const data = 'grant_type=client_credentials'
//
//     return await axios.post(
//         endpoint_url + '/v1/oauth2/token',
//         data,
//         {
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded',
//                 'Authorization': `Basic ${Buffer.from(auth).toString('base64')}`
//             },
//         }
//     )
//         .then(res => res.data)
//         .then(json => {
//             return json.access_token;
//         })
// }


const generateAccessToken = async () => {
    try {
        const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET_KEY).toString("base64");
        const response = await fetch(`${base}/v1/oauth2/token`, {
            method: "post",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        const data = await response.json();
        return data.access_token;
    } catch(error) {
        console.error("Failed to generate Access Token:", error);
    }
};

const createOrder = async () => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
    const payload = {
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: "USD",
                    value: "0.02",
                },
            },
        ],
    };

    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        method: "POST",
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
};


const capturePayment = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
        method: "post",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        }
    });

    return handleResponse(response);
};

async function handleResponse(response) {
    if (response.status === 200 || response.status === 201) {
        return response.json();
    }

    const errorMessage = await response.text();
    throw new Error(errorMessage);
}

module.exports =  { createOrder, capturePayment }