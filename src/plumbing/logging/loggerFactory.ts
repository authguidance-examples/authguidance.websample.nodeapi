import {Logger} from 'winston';
import {LoggingConfiguration} from '../configuration/loggingConfiguration';

/*
 * An interface that allows business logic to access logging objects
 */
export interface LoggerFactory {

    // Configuration at startup
    configure(configuration: LoggingConfiguration): void;

    // Handle exceptions starting the API
    logStartupError(exception: any): void;

    // Get a debug text logger for a developer PC
    getDevelopmentLogger(className: string): Logger;
}
