/*
 * Configuration settings to enable standard security and extensible use of claims
 */
export interface OAuthConfiguration {

    // The OAuth strategy to use, either 'standard' or 'claims-caching'
    strategy: string;

    // The expected issuer of access tokens
    issuer: string;

    // The expected audience of access tokens
    audience: string;

    // The strategy for validating access tokens, either 'jwt' or 'introspection'
    tokenValidationStrategy: string;

    // The endpoint from which to download the token signing public key, when validating JWTs
    jwksEndpoint: string;

    // The endpoint for token introspection
    introspectEndpoint: string;

    // The client id with which to call the introspection endpoint
    introspectClientId: string;

    // The client secret with which to call the introspection endpoint
    introspectClientSecret: string;

    // The URL to the Authorization Server's user info endpoint, which could be an internal URL
    // This is used with the claims caching strategy, when we need to look up user info claims
    userInfoEndpoint: string;

    // The maximum number of minutes for which to cache claims, when using the claims caching strategy
    claimsCacheTimeToLiveMinutes: number;
}
