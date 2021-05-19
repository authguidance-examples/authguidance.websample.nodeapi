import {injectable} from 'inversify';
import NodeCache from 'node-cache';
import {Logger} from 'winston';
import {LoggerFactory} from '../logging/loggerFactory';
import {ApiClaims} from './apiClaims';
import {ClaimsProvider} from './claimsProvider';

/*
 * A simple in memory claims cache for our API
 */
@injectable()
export class ClaimsCache {

    private readonly _cache: NodeCache;
    private readonly _claimsProvider: ClaimsProvider;
    private readonly _traceLogger: Logger;

    /*
     * Create the cache at application startup
     */
    public constructor(
        timeToLiveMinutes: number,
        claimsProvider: ClaimsProvider,
        loggerFactory: LoggerFactory) {

        this._claimsProvider = claimsProvider;
        this._traceLogger = loggerFactory.getDevelopmentLogger(ClaimsCache.name);

        // Create the cache and set a maximum time to live in seconds
        const defaultExpirySeconds = timeToLiveMinutes * 60;
        this._cache = new NodeCache({
            stdTTL: defaultExpirySeconds,
        });

        // If required add debug output here to verify expiry occurs when expected
        /* eslint-disable @typescript-eslint/no-unused-vars */
        this._cache.on('expired', (key: string, value: any) => {
            this._traceLogger.debug(`Expired token has been removed from the cache (hash: ${key})`);
        });
    }

    /*
     * Get claims from the cache or return null if not found
     */
    public async getClaimsForToken(accessTokenHash: string): Promise<ApiClaims | null> {

        // Get the token hash and see if it exists in the cache
        const claimsText = await this._cache.get<string>(accessTokenHash);
        if (!claimsText) {

            // If this is a new token and we need to do claims processing
            this._traceLogger.debug(`New token will be added to claims cache (hash: ${accessTokenHash})`);
            return null;
        }

        // Otherwise return cached claims
        this._traceLogger.debug(`Found existing token in claims cache (hash: ${accessTokenHash})`);
        return this._claimsProvider.deserializeFromCache(claimsText);
    }

    /*
     * Add claims to the cache until the token's time to live
     */
    public async addClaimsForToken(accessTokenHash: string, claims: ApiClaims): Promise<void> {

        // Use the exp field returned from introspection to work out the token expiry time
        const epochSeconds = Math.floor((new Date() as any) / 1000);
        let secondsToCache = claims.token.expiry - epochSeconds;
        if (secondsToCache > 0) {

            // Output debug info
            this._traceLogger.debug(
                `Token to be cached will expire in ${secondsToCache} seconds (hash: ${accessTokenHash})`);

            // Do not exceed the maximum time we configured
            if (secondsToCache > this._cache.options.stdTTL!) {
                secondsToCache = this._cache.options.stdTTL!;
            }

            // Cache the claims until the above time
            this._traceLogger.debug(
                `Adding token to claims cache for ${secondsToCache} seconds (hash: ${accessTokenHash})`);
            const claimsText = this._claimsProvider.serializeToCache(claims);
            await this._cache.set(accessTokenHash, claimsText, secondsToCache);
        }
    }
}
