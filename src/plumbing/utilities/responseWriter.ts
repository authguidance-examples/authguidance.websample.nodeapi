import {Response} from 'express';

/*
 * A helper object for writing standard responses
 */
export class ResponseWriter {

    /*
     * Return data to the caller, which could be a success or error object
     */
    public writeObjectResponse(response: Response, statusCode: number, data: any): void {

        // Write headers
        response.setHeader('Content-Type', 'application/json');
        if (statusCode === 401) {
            response.setHeader('WWW-Authenticate', 'Bearer');
        }

        // Write the response data
        response.status(statusCode).send(JSON.stringify(data));
    }
}
