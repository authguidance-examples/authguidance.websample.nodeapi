/*
 * Logging configuration settings
 */
export interface LoggingConfiguration {

    // The name under which to log requests
    apiName: string;

    // Production log settings
    production: any;

    // Development log settings
    development: any;
}
