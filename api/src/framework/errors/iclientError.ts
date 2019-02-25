
/*
 * An interface to represent client error behaviour
 */
export interface IClientError {

    // Return the HTTP status code
    getStatusCode(): int;

    // Return the JSON response format
    toResponseFormat(): any;

    // Return the JSON log format
    toLogFormat(): any;
}
