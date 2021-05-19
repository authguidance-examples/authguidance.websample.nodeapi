import {Request, Response} from 'express';
import {Guid} from 'guid-typescript';
import {injectable} from 'inversify';
import os from 'os';
import {Logger} from 'winston';
import {BaseClaims} from '../claims/baseClaims';
import {ClientError} from '../errors/clientError';
import {ServerError} from '../errors/serverError';
import {LogEntry} from './logEntry';
import {LogEntryData} from './logEntryData';
import {PerformanceBreakdown} from './performanceBreakdown';
import {RouteMetadataHandler} from './routeMetadataHandler';

/*
 * The full implementation class is private to the framework and excluded from the index.ts file
 */
@injectable()
export class LogEntryImpl implements LogEntry {

    private readonly _logger: Logger;
    private readonly _getPerformanceThreshold: ((op: string) => number) | null;
    private readonly _data: LogEntryData;

    /*
     * A log entry is created once per API request
     */
    public constructor(apiName: string, logger: Logger, getPerformanceThreshold: ((op: string) => number) | null) {

        // Record the logger details
        this._logger = logger;
        this._getPerformanceThreshold = getPerformanceThreshold;

        // Initialise data
        this._data = new LogEntryData();
        this._data.apiName = apiName;
        this._data.hostName = os.hostname();
    }

    /*
     * Start collecting data before calling the API's business logic
     */
    public start(request: Request): void {

        // Read request details
        this._data.performance.start();
        this._data.requestVerb = request.method;
        this._data.requestPath = request.originalUrl;

        // Our callers can supply a custom header so that we can keep track of who is calling each API
        const clientApplicationName = request.header('x-mycompany-api-client');
        if (clientApplicationName) {
            this._data.clientApplicationName = clientApplicationName;
        }

        // Use the correlation id from request headers or create one
        const correlationId = request.header('x-mycompany-correlation-id');
        this._data.correlationId = correlationId ? correlationId : Guid.create().toString();

        // Log an optional session id if supplied
        const sessionId = request.header('x-mycompany-session-id');
        if (sessionId) {
            this._data.sessionId = sessionId;
        }
    }

    /*
     * Add identity details for secured requests
     */
    public setIdentity(claims: BaseClaims): void {
        this._data.userOAuthId = claims.subject;
    }

    /*
     * An internal method for setting the operation name
     */
    public setOperationName(name: string): void {
        this._data.operationName = name;
    }

    /*
     * Extract the operations name and resource id values from metadata
     */
    public processRoutes(request: Request, routeMetadataHandler: RouteMetadataHandler): void {

        // Calculate the operation name from request.route
        const metadata = routeMetadataHandler.getOperationRouteInfo(request);
        if (metadata) {

            // Record the operation name and also ensure that the correct performance threshold is used
            this._data.operationName = metadata.operationName;
            if (this._getPerformanceThreshold) {
                this._data.performanceThresholdMilliseconds = this._getPerformanceThreshold(this._data.operationName);
            }

            // Also log URL path segments for resource ids
            this._data.resourceId = metadata.resourceIds.join('/');
        }
    }

    /*
     * Create a child performance breakdown when requested
     */
    public createPerformanceBreakdown(name: string): PerformanceBreakdown {
        return this._data.performance.createChild(name);
    }

    /*
     * Add error details after they have been processed by the exception handler, including denormalised fields
     */
    public setServerError(error: ServerError): void {
        this._data.errorData = error.toLogFormat(this._data.apiName);
        this._data.errorCode = error.getErrorCode();
        this._data.errorId = error.getInstanceId();
    }

    /*
     * Add error details after they have been processed by the exception handler, including denormalised fields
     */
    public setClientError(error: ClientError): void {
        this._data.errorData = error.toLogFormat();
        this._data.errorCode = error.getErrorCode();
    }

    /*
     * Enable free text to be added to production logs, though this should be avoided in most cases
     */
    public addInfo(info: any): void {
        this._data.infoData.push(info);
    }

    /*
     * Finish collecting data at the end of the API request
     */
    public end(response: Response): void {

        // Finish performance measurements
        this._data.performance.dispose();

        // Record response details
        this._data.statusCode = response.statusCode;

        // Finalise this log entry
        this._data.finalise();
    }

    /*
     * Output our data
     */
    public write(): void {

        this._writeDataItem(this._data);
    }

    /*
     * Write a single data item
     */
    private _writeDataItem(item: LogEntryData): void {

        // Get the object to log
        const logData = item.toLogFormat();

        // Output it
        if (item.errorData) {
            this._logger.error(logData);
        } else {
            this._logger.info(logData);
        }
    }
}
