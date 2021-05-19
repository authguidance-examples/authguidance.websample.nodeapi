/*
 * A holder for API specific configuration settings
 */
export interface ApiConfiguration {

    // The port to listen on
    port: number;

    // The path to the SSL certificate P12 file
    sslCertificateFileName: string;

    // The SSL certificate's private key password
    sslCertificatePassword: string;

    // Whether to use an HTTPS proxy
    useProxy: boolean;

    // The proxy URL when used
    proxyUrl: string;

    // We allow CORS requests from SPAs from these origins
    webTrustedOrigins: string[];
}
