import {Request} from 'express';
import {interfaces} from 'inversify-express-utils';
import {RouteMetadata} from './routeMetadata';

/*
 * A helper class to use Inversify Express Utils metadata at runtime to capture important logging fields
 * This is difficult since Express request data is not always available in middleware classes
 */
export class RouteMetadataHandler {

    private readonly _basePath: string;
    private readonly _metadata: {
        controllerMetadata: interfaces.ControllerMetadata;
        methodMetadata: interfaces.ControllerMethodMetadata[];
        parameterMetadata: interfaces.ControllerParameterMetadata;
        }[];

    public constructor(basePath: string, metadata: {
        controllerMetadata: interfaces.ControllerMetadata;
        methodMetadata: interfaces.ControllerMethodMetadata[];
        parameterMetadata: interfaces.ControllerParameterMetadata;
        }[]) {

        this._basePath = this._trimTrailingForwardSlash(basePath);
        this._metadata = metadata;
    }

    /*
     * Calculate the operation name and resource ids from path segments
     * For 'api/companies/2/transactions' we derive the operation name of 'getCompanyTransactions'
     * For 'api/companies/2/transactions' we find 'api/companies/:id/transactions' and get resource ids of 2
     */
    public getOperationRouteInfo(request: Request): RouteMetadata | null {

        let result: RouteMetadata | null = null;

        // Get the route, which will be a value such as 'api/companies/2/transactions' without the query string
        const requestPath = this._getRequestPath(request);
        if (requestPath) {

            // Process each controller and stop on the first find
            this._metadata.some((controller) => {

                // Process each controller operation and stop on the first find
                const found = controller.methodMetadata.some((operation) => {

                    // Get the full path, which will be a value such as 'api/companies/:id/transactions'
                    const controllerPath = controller.controllerMetadata.path;
                    const operationPath = this._getControllerOperationPath(controllerPath, operation.path);

                    // Return data if it is a matching route
                    const routeInfo = this._getMatchingRouteInfo(
                        requestPath,
                        request.method,
                        operationPath,
                        operation);

                    if (routeInfo) {
                        result = routeInfo;
                        return true;
                    }
                });

                if (found) {
                    return true;
                }
            });
        }

        return result;
    }

    /*
     * Use the full request path, such as '/api/companies/2/transactions', which is available in all middleware
     */
    private _getRequestPath(request: Request): string {

        // Remove query parts of the request path
        let path = this._removeQuery(request.originalUrl, '?');
        path = this._removeQuery(path, '#');

        // Then trim the result
        return this._trimTrailingForwardSlash(path.toLowerCase());
    }

    /*
     * Remove the query part of the request path before processing
     */
    private _removeQuery(path: string, separator: string): string {

        const queryPos = path.indexOf(separator);
        if (queryPos !== -1) {
            return path.substring(0, queryPos);
        }

        return path;
    }

    /*
     * Deal with concatenation while handling forward slashes
     */
    private _getControllerOperationPath(controllerPath: string, operationPath: string) {

        // Get a value such as '/companies'
        const trimmedControllerPath = this._trimTrailingForwardSlash(controllerPath.toLowerCase());

        // Get a value such as ':id/transactions'
        const trimmedOperationPath =
            this._trimTrailingForwardSlash(this._trimLeadingForwardSlash(operationPath.toLowerCase()));

        // Concatenate parts and return the full path, such as '/companies/:id/transactions'
        let path = '';
        if (trimmedControllerPath.length > 0) {
            path += trimmedControllerPath;
        }
        if (trimmedOperationPath.length > 0) {
            path += '/' + trimmedOperationPath;
        }

        // Return a value such as '/api/companies/:id/transactions'
        return this._basePath + path;
    }

    /*
     * Check for a match on the HTTP verb, such as 'GET', and the request path, such as '/api/companies/2/transactions'
     */
    private _getMatchingRouteInfo(
        requestPath: string,
        requestMethod: string,
        operationPath: string,
        operationMetadata: interfaces.ControllerMethodMetadata): RouteMetadata | null {

        // Check that the HTTP verb matches that configured against the operation
        if (operationMetadata.method.toLowerCase() !== requestMethod.toLowerCase()) {
            return null;
        }

        // Split into parts
        const operationParts = operationPath.split('/');
        const requestParts = requestPath.split('/');
        if (operationParts.length !== requestParts.length) {
            return null;
        }

        // Consider them equal if all path segments match exactly, other than wildcards
        const segments = requestParts.length;
        const resourceIds = [];
        for (let segment = 0; segment < segments; segment++) {

            // Consider REST template parameters to be a match
            if (operationParts[segment].startsWith(':')) {

                // Add to resource ids
                resourceIds.push(requestParts[segment]);
            } else {

                // For non template parameters require an exact match
                if (operationParts[segment] !== requestParts[segment]) {
                    return null;
                }
            }
        }

        // Return the operation name and the REST template parameters, which will be logged
        return {
            operationName: operationMetadata.key,
            resourceIds,
        };
    }

    private _trimTrailingForwardSlash(input: string): string {
        return input.replace(/\/+$/, '');
    }

    private _trimLeadingForwardSlash(input: string): string {
        return input.replace(/^\/+/, '');
    }
}
