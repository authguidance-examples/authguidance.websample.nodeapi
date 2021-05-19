import {NextFunction, Request, Response} from 'express';
import {injectable} from 'inversify';
import {ApiClaims} from '../claims/apiClaims';
import {CustomClaims} from '../claims/customClaims';
import {ClaimsProvider}  from '../claims/claimsProvider';
import {BaseClaims} from '../claims/baseClaims';
import {UserInfoClaims} from '../claims/userInfoClaims';
import {BASETYPES} from '../dependencies/baseTypes';
import {ChildContainerHelper} from '../dependencies/childContainerHelper';
import {LogEntryImpl} from '../logging/logEntryImpl';
import {UnhandledExceptionHandler} from '../middleware/unhandledExceptionHandler';

/*
 * A base authorizer class that manages base handling related to logging and dependency resolution
 */
@injectable()
export abstract class BaseAuthorizer {

    private _unsecuredPaths: string[];

    public constructor() {
        this._unsecuredPaths = [];
        this._setupCallbacks();
    }

    public setUnsecuredPaths(paths: string[]): void {
        this._unsecuredPaths = paths;
    }

    /*
     * The entry point for implementing authorization
     */
    public async authorizeRequestAndGetClaims(request: Request, response: Response, next: NextFunction): Promise<void> {

        // Bypass OAuth security for unsecured paths
        if (this._unsecuredPaths.find((p) => request.originalUrl.toLowerCase().startsWith(p.toLowerCase()))) {
            next();
            return;
        }

        // Get the container for this request
        const perRequestContainer = ChildContainerHelper.resolve(request);

        try {

            // Resolve per request objects
            const claimsProvider =  perRequestContainer.get<ClaimsProvider>(BASETYPES.ClaimsProvider);
            const logEntry = perRequestContainer.get<LogEntryImpl>(BASETYPES.LogEntry);

            // Do authorization processing for this request, to get all claims the API needs
            const claims = await this.execute(request, claimsProvider, logEntry);

            // Bind claims objects to this requests's child container so that they are injectable into business logic
            perRequestContainer.bind<BaseClaims>(BASETYPES.BaseClaims).toConstantValue(claims.token);
            perRequestContainer.bind<UserInfoClaims>(BASETYPES.UserInfoClaims).toConstantValue(claims.userInfo);
            perRequestContainer.bind<CustomClaims>(BASETYPES.CustomClaims).toConstantValue(claims.custom);

            // Log caller identity details
            logEntry.setIdentity(claims.token);

            // On success, move on to the controller logic
            next();

        } catch (e) {

            // Handle authorization exceptions
            const exceptionHandler = perRequestContainer.get<UnhandledExceptionHandler>(
                BASETYPES.UnhandledExceptionHandler);
            exceptionHandler.handleException(e, request, response, next);
        }
    }

    /*
     * Try to read the token from the authorization header
     */
    protected readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                return parts[1];
            }
        }

        return null;
    }

    // Concrete classes must override this
    protected abstract execute(
        request: Request,
        claimsProvider: ClaimsProvider,
        logEntry: LogEntryImpl): Promise<ApiClaims>;

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.authorizeRequestAndGetClaims = this.authorizeRequestAndGetClaims.bind(this);
    }
}
