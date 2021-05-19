import {ClaimsPayload} from '../../claims/claimsPayload';

/*
 * An interface for validating tokens, which can have multiple implementations
 */
export interface TokenValidator {
    validateToken(accessToken: string): Promise<ClaimsPayload>;
}