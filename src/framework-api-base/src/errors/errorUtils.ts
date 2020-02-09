import {ErrorFactory} from '../../../framework-api-base';
import {ExtendedError} from '../../../framework-base';
import {ApiError} from './apiError';
import {BaseErrorCodes} from './baseErrorCodes';
import {ClientError} from './clientError';

/*
 * General error utility functions
 */
export class ErrorUtils {

    /*
     * Return or create a typed error
     */
    public static fromException(exception: any): ApiError | ClientError {

        const apiError = this.tryConvertToApiError(exception);
        if (apiError !== null) {
            return apiError;
        }

        const clientError = this.tryConvertToClientError(exception);
        if (clientError !== null) {
            return clientError;
        }

        return ErrorUtils.createApiError(exception);
    }

    /*
     * Create an error from an exception
     */
    public static createApiError(exception: any, errorCode?: string, message?: string): ApiError {

        // Default details
        const defaultErrorCode = BaseErrorCodes.serverError;
        const defaultMessage = 'An unexpected exception occurred in the API';

        // Create the error
        const error = ErrorFactory.createApiError(
            errorCode || defaultErrorCode,
            message || defaultMessage,
            exception.stack);
        error.setDetails(ErrorUtils._getExceptionDetailsMessage(exception));
        return error;
    }

    /*
     * The error thrown if we cannot find an expected claim during security handling
     */
    public static fromMissingClaim(claimName: string): ApiError {

        const apiError = ErrorFactory.createApiError(BaseErrorCodes.claimsFailure, 'Authorization Data Not Found');
        apiError.setDetails(`An empty value was found for the expected claim ${claimName}`);
        return apiError;
    }

    /*
     * See if the exception is convertible to a REST API error
     */
    private static tryConvertToApiError(exception: any): ApiError | null {

        // Already handled
        if (exception instanceof ApiError) {
            return exception as ApiError;
        }

        // Convert from our technology neutral custom exception to an API specific error
        if (exception instanceof ExtendedError) {
            const error = exception as ExtendedError;

            const apiError = ErrorFactory.createApiError(
                error.code,
                error.message,
                error.stack);

            if (error.details) {
                apiError.setDetails(error.details);
            }

            return apiError;
        }

        return null;
    }

    /*
     * Try to convert an exception to a ClientError
     */
    private static tryConvertToClientError(exception: any): ClientError | null {

        if (exception instanceof ClientError) {
            return exception as ClientError;
        }

        return null;
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static _getExceptionDetailsMessage(e: any): string {

        if (e.message) {
            return e.message;
        } else {
            const details = e.toString();
            if (details !== {}.toString()) {
                return details;
            } else {
                return '';
            }
        }
    }
}