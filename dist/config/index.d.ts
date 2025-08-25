export declare const config: {
    env: string;
    port: number;
    appName: string;
    apiVersion: string;
    apiUrl: string;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        dialect: string;
        logging: boolean;
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    security: {
        bcryptRounds: number;
        rateLimitWindow: number;
        rateLimitMaxRequests: number;
    };
    external: {
        mpesa: {
            consumerKey: string;
            consumerSecret: string;
            environment: string;
            paybillNumber: string;
            passkey: string;
        };
        africasTalking: {
            apiKey: string;
            username: string;
        };
        sha: {
            baseUrl: string;
            apiKey: string;
        };
    };
    email: {
        host: string | undefined;
        port: number;
        user: string;
        password: string;
        from: string;
    };
    upload: {
        maxFileSize: string;
        uploadPath: string;
    };
    aws: {
        accessKeyId: string | undefined;
        secretAccessKey: string | undefined;
        region: string;
        s3Bucket: string;
    };
    ussd: {
        serviceCode: string;
    };
    system: {
        defaultGracePeriodDays: number;
        maxAdvancePaymentDays: number;
        commissionPayoutFrequency: string;
        shaTransferFrequency: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
};
export declare const validateConfig: () => void;
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export default config;
//# sourceMappingURL=index.d.ts.map