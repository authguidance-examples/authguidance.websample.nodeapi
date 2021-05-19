import {NextFunction, Request, Response} from 'express';
import {BaseErrorCodes} from '../errors/baseErrorCodes';
import {ErrorFactory} from '../errors/errorFactory';

/*
 * A class to process custom headers to enable testers to control non functional behaviour
 */
export class CustomHeaderMiddleware {

    private readonly _apiName: string;

    public constructor(apiName: string) {
        this._apiName = apiName.toLowerCase();
        this._setupCallbacks();
    }

    /*
     * Enable testers to select an API to break as part of non functional testing
     * This can be especially useful when there are many APIs and they call each other
     */
    public processHeaders(request: Request, response: Response, next: NextFunction): void {

        const apiToBreak = request.header('x-mycompany-test-exception');
        if (apiToBreak) {
            if (apiToBreak.toLowerCase() === this._apiName.toLowerCase()) {

                throw ErrorFactory.createServerError(
                    BaseErrorCodes.exceptionSimulation,
                    'An unexpected exception occurred in the API');
            }
        }

        next();
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.processHeaders = this.processHeaders.bind(this);
    }
}
