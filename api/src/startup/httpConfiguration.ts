import * as cors from 'cors';
import {Application, NextFunction, Request, Response} from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as url from 'url';
import {Configuration} from '../configuration/configuration';
import {WebApi} from '../logic/webApi';
import {ApiLogger} from '../plumbing/utilities/apiLogger';

/*
 * The relative path to web files
 */
const WEB_FILES_ROOT = '../../..';

/*
 * Configure Express
 */
export class HttpConfiguration {

    /*
     * Injected dependencies
     */
    private _expressApp: Application;
    private _apiConfig: Configuration;
    private _webApi: WebApi;

    /*
     * Class setup
     */
    public constructor(expressApp: Application, apiConfig: Configuration) {
        this._expressApp = expressApp;
        this._apiConfig = apiConfig;
        this._webApi = new WebApi(this._apiConfig);
    }

    /*
     * Set up Web API routes and initialize the API
     */
    public async initializeApi(): Promise<void> {

        // Deal with Express unhandled promise exceptions during async operations
        // https://medium.com/@Abazhenov/using-async-await-in-express-with-node-8-b8af872c0016
        const catcher = ( fn: any) =>
            (request: Request, response: Response, next: NextFunction) => {

                Promise
                    .resolve(fn(request, response, next))
                    .catch((e) => {
                        this._webApi.unhandledExceptionHandler(e, request, response);
                        return next;
                    });
        };

        // We don't want API requests to be cached unless explicitly designed for caching
        this._expressApp.set('etag', false);

        // Allow cross origin requests from the SPA
        const corsOptions = { origin: this._apiConfig.app.trustedOrigins };
        this._expressApp.use('/api/*', cors(corsOptions));

        // All API requests are authorized first
        this._expressApp.use('/api/*', catcher(this._webApi.authorizationHandler));

        // API routes containing business logic
        this._expressApp.get('/api/userclaims/current', this._webApi.getUserClaims);
        this._expressApp.get('/api/companies', catcher(this._webApi.getCompanyList));
        this._expressApp.get('/api/companies/:id/transactions', catcher(this._webApi.getCompanyTransactions));

        // Our exception middleware handles all exceptions
        this._expressApp.use('/api/*', this._webApi.unhandledExceptionHandler);

        // Prepate the API to handle secured requests
        await this._webApi.initialize();
    }

    /*
     * Set up listening for web content
     */
    public initializeWeb(): void {

        this._expressApp.get('/spa/*', this._getWebResource);
        this._expressApp.get('/spa', this._getWebRootResource);
        this._expressApp.get('/favicon.ico', this._getFavicon);
    }

    /*
     * Start listening
     */
    public startServer(): void {

        // Use the web URL to determine the port
        const webUrl = url.parse(this._apiConfig.app.trustedOrigins[0]);

        // Calculate the port from the URL
        let port = 443;
        if (webUrl.port) {
            port = Number(webUrl.port);
        }

        // Node does not support certificate stores so we need to load a certificate file from disk
        const sslOptions = {
            pfx: fs.readFileSync(`certs/${this._apiConfig.app.sslCertificateFileName}`),
            passphrase: this._apiConfig.app.sslCertificatePassword,
        };

        // Start listening on HTTPS
        const httpsServer = https.createServer(sslOptions, this._expressApp);
        httpsServer.listen(port, () => {
            ApiLogger.info(`Server is listening on HTTPS port ${port}`);
        });
    }

    /*
     * Serve up the requested web file
     */
    private _getWebResource(request: Request, response: Response): void {

        let resourcePath = request.path.replace('spa/', '');
        if (resourcePath === '/') {
           resourcePath = 'index.html';
        }

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/${resourcePath}`);
        response.sendFile(webFilePath);
    }

    /*
     * Serve up the requested web file
     */
    private _getWebRootResource(request: Request, response: Response): void {

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/index.html`);
        response.sendFile(webFilePath);
    }

    /*
     * Serve up our favicon
     */
    private _getFavicon(request: Request, response: Response): void {

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/favicon.ico`);
        response.sendFile(webFilePath);
    }
}