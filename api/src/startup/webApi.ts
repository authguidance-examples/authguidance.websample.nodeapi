import {NextFunction, Request, Response} from 'express';
import {Configuration} from '../configuration/configuration';
import {BasicApiClaims} from '../entities/BasicApiClaims';
import {UserInfoClaims} from '../entities/userInfoClaims';
import {ClientError} from '../framework/errors/clientError';
import {ErrorHandler} from '../framework/errors/errorHandler';
import {Authenticator} from '../framework/oauth/authenticator';
import {ClaimsCache} from '../framework/oauth/claimsCache';
import {ClaimsMiddleware} from '../framework/oauth/claimsMiddleware';
import {IssuerMetadata} from '../framework/oauth/issuerMetadata';
import {ResponseWriter} from '../framework/utilities/responseWriter';
import {BasicApiClaimsProvider} from '../logic/basicApiClaimsProvider';
import {CompanyController} from '../logic/companyController';
import {CompanyRepository} from '../logic/companyRepository';
import {JsonFileReader} from '../utilities/jsonFileReader';

/*
 * This presents an overview of our overall API behaviour and deals with Express's request and response objects
 */
export class WebApi {

    /*
     * Dependencies
     */
    private _apiConfig: Configuration;
    private _claimsCache: ClaimsCache;
    private _issuerMetadata: IssuerMetadata;

    /*
     * API construction
     */
    public constructor(apiConfig: Configuration) {

        this._apiConfig = apiConfig;
        this._claimsCache = new ClaimsCache(this._apiConfig.oauth);
        this._issuerMetadata = new IssuerMetadata(this._apiConfig.oauth);
        this._setupCallbacks();
    }

    /*
     * Load metadata once at application startup
     */
    public async initialize(): Promise<void> {
        await this._issuerMetadata.load();
    }

    /*
     * The entry point for authorization and claims handling
     */
    public async authorizationHandler(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create authorization related classes on every API request
        const authenticator = new Authenticator(this._apiConfig.oauth, this._issuerMetadata.metadata);
        const customClaimsProvider = new BasicApiClaimsProvider();
        const middleware = new ClaimsMiddleware(this._claimsCache, authenticator, customClaimsProvider);

        // Try to get the access token and create empty claims
        const accessToken = this._readAccessToken(request);
        const claims = new BasicApiClaims();

        // Call the middleware to do the work
        const success = await middleware.authorizeRequestAndSetClaims(accessToken, claims);
        if (success) {

            // On success, set claims against the request context and move on to the controller logic
            response.locals.claims = claims;
            next();

        } else {

            // Non success responses mean a missing, expired or invalid token, and we will return 401
            // Note that any failures will be thrown as exceptions and will result in a 500 response
            ResponseWriter.writeInvalidTokenResponse(response);
        }
    }

    /*
     * Return the user info claims from authorization
     */
    public getUserClaims(
        request: Request,
        response: Response,
        next: NextFunction): void {

        const claims = response.locals.claims as BasicApiClaims;
        const userInfo = {
            givenName: claims.givenName,
            familyName: claims.familyName,
            email: claims.email,
        } as UserInfoClaims;

        ResponseWriter.writeObjectResponse(response, 200, userInfo);
    }

    /*
     * Return a list of companies
     */
    public async getCompanyList(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create the controller instance and its dependencies on every API request
        const reader = new JsonFileReader();
        const repository = new CompanyRepository(response.locals.claims, reader);
        const controller = new CompanyController(repository);

        // Get the data and return it in the response
        const result = await controller.getCompanyList();
        ResponseWriter.writeObjectResponse(response, 200, result);
    }

    /*
     * Return company transactions
     */
    public async getCompanyTransactions(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create the controller instance and its dependencies on every API request
        const reader = new JsonFileReader();
        const repository = new CompanyRepository(response.locals.claims, reader);
        const controller = new CompanyController(repository);

        // Get the supplied id as a number, and return 400 if invalid input was received
        const id = parseInt(request.params.id, 10);
        if (isNaN(id) || id <= 0) {
            throw new ClientError(
                400,
                'invalid_company_id',
                'The company id must be a positive numeric integer');
        }

        const result = await controller.getCompanyTransactions(id);
        ResponseWriter.writeObjectResponse(response, 200, result);
    }

    /*
     * The entry point for handling exceptions forwards all exceptions to our handler class
     */
    public unhandledExceptionHandler(
        unhandledException: any,
        request: Request,
        response: Response): void {

        const clientError = ErrorHandler.handleError(unhandledException);
        ResponseWriter.writeObjectResponse(response, clientError.statusCode, clientError.toResponseFormat());
    }

    /*
     * Try to read the token from the authorization header
     */
    private _readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                return parts[1];
            }
        }

        return null;
    }

    /*
     * Set up async callbacks
     */
    private _setupCallbacks(): void {
        this.authorizationHandler = this.authorizationHandler.bind(this);
        this.getUserClaims = this.getUserClaims.bind(this);
        this.getCompanyList = this.getCompanyList.bind(this);
        this.getCompanyTransactions = this.getCompanyTransactions.bind(this);
        this.unhandledExceptionHandler = this.unhandledExceptionHandler.bind(this);
    }
}
