import cors from 'cors';
import express from 'express';
import fs from 'fs-extra';
import https from 'https';
import {Container} from 'inversify';
import {InversifyExpressServer} from 'inversify-express-utils';
import {BaseCompositionRoot} from '../../plumbing/dependencies/baseCompositionRoot';
import {LoggerFactory} from '../../plumbing/logging/loggerFactory';
import {SampleClaimsProvider} from '../claims/sampleClaimsProvider';
import {Configuration} from '../configuration/configuration';
import {CompositionRoot} from '../dependencies/compositionRoot';

/*
 * Configure HTTP behaviour at application startup
 */
export class HttpServerConfiguration {

    private readonly _configuration: Configuration;
    private readonly _container: Container;
    private readonly _loggerFactory: LoggerFactory;
    private readonly _expressApp: express.Application;

    public constructor(configuration: Configuration, container: Container, loggerFactory: LoggerFactory) {
        this._configuration = configuration;
        this._container = container;
        this._loggerFactory = loggerFactory;
        this._expressApp = express();
    }

    /*
     * Configure behaviour before starting the server
     */
    public async configure(): Promise<void> {

        // Use common code and give it any data it needs
        const base = new BaseCompositionRoot(this._container)
            .useApiBasePath('/api/')
            .addUnsecuredPath('/api/customclaims')
            .useOAuth(this._configuration.oauth)
            .withClaimsProvider(new SampleClaimsProvider())
            .withLogging(this._configuration.logging, this._loggerFactory)
            .withProxyConfiguration(this._configuration.api.useProxy, this._configuration.api.proxyUrl)
            .register();

        // Register the API's own dependencies
        CompositionRoot.registerDependencies(this._container);

        // Configure Inversify Express, which will register @controller attributes and set up controller autowiring
        new InversifyExpressServer(this._container, null, {rootPath: '/api/'}, this._expressApp)
            .setConfig(() => {

                // Our API requests are not designed for caching
                this._expressApp.set('etag', false);

                // Allow cross origin requests from the SPA
                const corsOptions = { origin: this._configuration.api.webTrustedOrigins };
                this._expressApp.use('/api/*', cors(corsOptions) as any);

                // We must configure Express cross cutting concerns during this callback
                base.configureMiddleware(this._expressApp);
            })
            .setErrorConfig(() => {

                // Inversify Express requires us to add the middleware for exception handling here
                base.configureExceptionHandler(this._expressApp);
            })
            .build();

        // Finalise once routes are avaiilable, which enables us to log path based fields later
        base.finalise();
    }

    /*
     * Start listening for requests
     */
    public async start(): Promise<void> {

        const port = this._configuration.api.port;
        if (this._configuration.api.sslCertificateFileName && this._configuration.api.sslCertificatePassword) {

            // Load certificate details
            const pfxFile = await fs.readFile(this._configuration.api.sslCertificateFileName);
            const serverOptions = {
                pfx: pfxFile,
                passphrase: this._configuration.api.sslCertificatePassword,
            };

            // Start listening over HTTPS
            const httpsServer = https.createServer(serverOptions, this._expressApp);
            httpsServer.listen(port, () => {
                console.log(`API is listening on HTTPS port ${port}`);
            });

        } else {

            // Otherwise listen over HTTP
            this._expressApp.listen(port, () => {
                console.log(`API is listening on HTTP port ${port}`);
            });
        }
    }
}
