import {inject, injectable} from 'inversify';
import {custom, IntrospectionResponse, Issuer} from 'openid-client';
import {ClaimsPayload} from '../../claims/claimsPayload';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {BASETYPES} from '../../dependencies/baseTypes';
import {ErrorFactory} from '../../errors/errorFactory';
import {ErrorUtils} from '../../errors/errorUtils';
import {HttpProxy} from '../../utilities/httpProxy';
import {TokenValidator} from './tokenValidator';

/*
 * An implementation that validates access tokens by introspecting them
 */
@injectable()
export class IntrospectionValidator implements TokenValidator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _httpProxy: HttpProxy;

    public constructor(
        @inject(BASETYPES.OAuthConfiguration) configuration: OAuthConfiguration,
        @inject(BASETYPES.HttpProxy) httpProxy: HttpProxy) {

        this._configuration = configuration;
        this._httpProxy = httpProxy;
    }

    /*
     * The entry point for validating a token via introspection and returning its claims
     */
    public async validateToken(accessToken: string): Promise<ClaimsPayload> {

        const issuer = new Issuer({
            issuer:this._configuration.issuer,
            introspection_endpoint: this._configuration.introspectEndpoint,
        });

        const client = new issuer.Client({
            client_id: this._configuration.introspectClientId,
            client_secret: this._configuration.introspectClientSecret,
        });

        client[custom.http_options] = this._httpProxy.setOptions;

        try {

            // Make a client request to do the introspection
            const tokenData: IntrospectionResponse = await client.introspect(accessToken);
            if (!tokenData.active) {
                throw ErrorFactory.createClient401Error('Access token introspection response inactive');
            }

            return new ClaimsPayload(tokenData);

        } catch (e) {

            // Sanitize introspection errors to ensure they are reported clearly
            throw ErrorUtils.fromIntrospectionError(e, this._configuration.introspectEndpoint);
        }
    }
}
