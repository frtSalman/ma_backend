import axios from 'axios';
import crypto from 'crypto';

const DEFAULT_BASE_URL = 'https://sandbox-api.iyzipay.com';

const getConfig = () => {
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    const baseUrl = process.env.IYZICO_BASE_URL || DEFAULT_BASE_URL;

    if (!apiKey || !secretKey) {
        throw new Error(
            'IYZICO_API_KEY ve IYZICO_SECRET_KEY environment değişkenleri zorunludur.'
        );
    }

    return { apiKey, secretKey, baseUrl };
};

const buildAuthorization = ({ apiKey, secretKey, uriPath, body }) => {
    const randomKey = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const requestBody = body ? JSON.stringify(body) : '';
    const payload = `${randomKey}${uriPath}${requestBody}`;

    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

    const authContent = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
    const authorization = `IYZWSv2 ${Buffer.from(authContent).toString('base64')}`;

    return { authorization, randomKey, requestBody };
};

export const iyzicoRequest = async ({ method, path, body = null, params }) => {
    const { apiKey, secretKey, baseUrl } = getConfig();
    const uriPath = params
        ? `${path}?${new URLSearchParams(params).toString()}`
        : path;

    const { authorization, randomKey, requestBody } = buildAuthorization({
        apiKey,
        secretKey,
        uriPath,
        body,
    });

    const response = await axios({
        method,
        url: `${baseUrl}${uriPath}`,
        data: requestBody ? JSON.parse(requestBody) : undefined,
        headers: {
            Authorization: authorization,
            'x-iyzi-rnd': randomKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        timeout: 30000,
    });

    return response.data;
};
