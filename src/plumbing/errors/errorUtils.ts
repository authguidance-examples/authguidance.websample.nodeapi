import {BaseErrorCodes} from './baseErrorCodes';
import {ClientError} from './clientError';
import {ErrorFactory} from './errorFactory';
import {ServerError} from './serverError';

/*
 * General error utility functions
 */
export class ErrorUtils {

    /*
     * Return or create a typed error
     */
    public static fromException(exception: any): ServerError | ClientError {

        const serverError = this.tryConvertToServerError(exception);
        if (serverError !== null) {
            return serverError;
        }

        const clientError = this.tryConvertToClientError(exception);
        if (clientError !== null) {
            return clientError;
        }

        return ErrorUtils.createServerError(exception);
    }

    /*
     * Create an error from an exception
     */
    public static createServerError(exception: any, errorCode?: string, message?: string): ServerError {

        // Default details
        const defaultErrorCode = BaseErrorCodes.serverError;
        const defaultMessage = 'An unexpected exception occurred in the API';

        // Create the error
        const error = ErrorFactory.createServerError(
            errorCode || defaultErrorCode,
            message || defaultMessage,
            exception.stack);
        error.setDetails(ErrorUtils._getExceptionDetailsMessage(exception));
        return error;
    }

    /*
     * Handle introspection failures
     */
    public static fromIntrospectionError(responseError: any, url: string): ServerError | ClientError {

        // Avoid reprocessing
        if (responseError instanceof ServerError) {
            return responseError;
        }
        if (responseError instanceof ClientError) {
            return responseError;
        }

        const [code, description] = ErrorUtils._readOAuthErrorResponse(responseError);
        const error = ErrorUtils._createOAuthServerError(
            BaseErrorCodes.introspectionFailure,
            'Token validation failed',
            code,
            responseError.stack);

        ErrorUtils._setErrorDetails(error, description, responseError, url);
        return error;
    }

    /*
     * Handle the error for key identifier lookups
     */
    public static fromSigningKeyDownloadError(responseError: any, url: string): ServerError {

        const error = ErrorFactory.createServerError(
            BaseErrorCodes.tokenSigningKeysDownloadError,
            'Problem downloading token signing keys',
            responseError.stack);

        ErrorUtils._setErrorDetails(error, null, responseError, url);
        return error;
    }

    /*
     * Handle user info lookup failures
     */
    public static fromUserInfoError(responseError: any, url: string): ServerError | ClientError {

        // Handle a race condition where the access token expires during user info lookup
        if (responseError.error && responseError.error === BaseErrorCodes.userInfoTokenExpired) {
            return ErrorFactory.createClient401Error('Access token expired during user info lookup');
        }

        // Avoid reprocessing
        if (responseError instanceof ServerError) {
            return responseError;
        }

        const [code, description] = ErrorUtils._readOAuthErrorResponse(responseError);
        const error = ErrorUtils._createOAuthServerError(
            BaseErrorCodes.userinfoFailure,
            'User info lookup failed',
            code,
            responseError.stack);

        ErrorUtils._setErrorDetails(error, description, responseError, url);
        return error;
    }

    /*
     * The error thrown if we cannot find an expected claim during security handling
     */
    public static fromMissingClaim(claimName: string): ServerError {

        const error = ErrorFactory.createServerError(BaseErrorCodes.claimsFailure, 'Authorization Data Not Found');
        error.setDetails(`An empty value was found for the expected claim '${claimName}'`);
        return error;
    }

    /*
     * Return the error and error_description fields from an OAuth error message if present
     */
    private static _readOAuthErrorResponse(responseError: any): [string | null, string | null] {

        let code = null;
        let description = null;

        if (responseError.response && responseError.response.body) {

            if (responseError.response.body.error) {
                code = responseError.response.body.error;
            }

            if (responseError.response.body.error_description) {
                description = responseError.response.body.error_description;
            }
        }

        return [code, description];
    }

    /*
     * Create an error object from an error code and include the OAuth error code in the user message
     */
    private static _createOAuthServerError(
        errorCode: string,
        userMessage: string,
        oauthErrorCode: string | null,
        stack: string | undefined): ServerError {

        // Include the OAuth error code in the short technical message returned
        let message = userMessage;
        if (errorCode) {
            message += ` : ${oauthErrorCode}`;
        }

        return ErrorFactory.createServerError(errorCode, message, stack);
    }

    /*
     * Update the error object with technical exception details
     */
    private static _setErrorDetails(
        error: ServerError,
        details: string | null,
        responseError: any,
        url: string): void {

        let detailsText = '';
        if (details) {
            detailsText += details;
        } else {
            detailsText += ErrorUtils._getExceptionDetailsMessage(responseError);
        }

        if (url) {
            detailsText += `, URL: ${url}`;
        }
        error.setDetails(detailsText);
    }

    /*
     * See if the exception is convertible to a server error
     */
    private static tryConvertToServerError(exception: any): ServerError | null {

        // Already handled
        if (exception instanceof ServerError) {
            return exception;
        }

        return null;
    }

    /*
     * Try to convert an exception to a client error
     */
    private static tryConvertToClientError(exception: any): ClientError | null {

        if (exception instanceof ClientError) {
            return exception;
        }

        return null;
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static _getExceptionDetailsMessage(e: any): string {

        if (e.message) {
            return e.message;
        }

        const details = e.toString();
        if (details !== {}.toString()) {
            return details;
        }

        return '';
    }
}
