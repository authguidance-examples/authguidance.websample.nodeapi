import {Request} from 'express';
import {ApiClaims} from '../claims/apiClaims';
import {ClaimsProvider} from '../claims/claimsProvider';
import {BASETYPES} from '../dependencies/baseTypes';
import {ChildContainerHelper} from '../dependencies/childContainerHelper';
import {ErrorFactory} from '../errors/errorFactory';
import {BaseAuthorizer} from '../security/baseAuthorizer';
import {OAuthAuthenticator} from './oauthAuthenticator';

/*
 * An authorizer that relies on the advanced features of the Authorization Server to provide claims
 * This is the preferred option when supported, since it leads to simpler code and better security
 */
export class StandardAuthorizer extends BaseAuthorizer {

    /*
     * Do the OAuth processing via the middleware class
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
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

        // Do the token validation work
        const authenticator = perRequestContainer.get<OAuthAuthenticator>(BASETYPES.OAuthAuthenticator);
        const tokenData = await authenticator.validateToken(accessToken);

        // Ask the claims provider to create the final claims object
        return claimsProvider.readClaims(tokenData);
    }
}
