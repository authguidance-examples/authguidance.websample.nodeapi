import {LoggingConfiguration} from '../../plumbing/configuration/loggingConfiguration';
import {OAuthConfiguration} from '../../plumbing/configuration/oauthConfiguration';
import {ApiConfiguration} from './apiConfiguration';

/*
 * A holder for configuration settings
 */
export interface Configuration {

    // API specific configuration
    api: ApiConfiguration;

    // Common logging configuration
    logging: LoggingConfiguration;

    // Common OAuth configuration
    oauth: OAuthConfiguration;
}
