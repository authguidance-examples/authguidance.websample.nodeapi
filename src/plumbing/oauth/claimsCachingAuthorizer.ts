import {Request} from 'express';
import hasher from 'js-sha256';
import {ApiClaims} from '../claims/apiClaims';
import {ClaimsCache} from '../claims/claimsCache';
import {ClaimsProvider} from '../claims/claimsProvider';
import {BASETYPES} from '../dependencies/baseTypes';
import {ChildContainerHelper} from '../dependencies/childContainerHelper';
import {ErrorFactory} from '../errors/errorFactory';
import {BaseAuthorizer} from '../security/baseAuthorizer';
import {OAuthAuthenticator} from './oauthAuthenticator';

/*
 * An authorizer that manages claims in an extensible manner, with the ability to use claims from the API's own data
 */
export class ClaimsCachingAuthorizer extends BaseAuthorizer {

    /*
     * Do the OAuth processing via the middleware class
     */
    protected async execute(
        request: Request,
        claimsProvider: ClaimsProvider): Promise<ApiClaims> {

        // First read the access token
        const accessToken = super.readAccessToken(request);
        if (!accessToken) {
            throw ErrorFactory.createClient401Error('No access token was supplied in the bearer header');
        }

        // Get the child container for this HTTP request
        const perRequestContainer = ChildContainerHelper.resolve(request);

        // If cached results already exist for this token then return them immediately
        const accessTokenHash = hasher.sha256(accessToken);
        const cache = perRequestContainer.get<ClaimsCache>(BASETYPES.ClaimsCache);
        const cachedClaims = await cache.getClaimsForToken(accessTokenHash);
        if (cachedClaims) {
            return cachedClaims;
        }

        // Get an OAuth client for this request
        const authenticator = perRequestContainer.get<OAuthAuthenticator>(BASETYPES.OAuthAuthenticator);

        // Validate the token and read token claims
        const tokenData = await authenticator.validateToken(accessToken);

        // Do the work for user info lookup
        const userInfoData = await authenticator.getUserInfo(accessToken);

        // Ask the claims provider to create the final claims object
        const claims = await claimsProvider.supplyClaims(tokenData, userInfoData);

        // Cache the claims against the token hash until the token's expiry time
        await cache.addClaimsForToken(accessTokenHash, claims);
        return claims;
    }
}
