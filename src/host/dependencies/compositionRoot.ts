import {Container} from 'inversify';
import {SAMPLETYPES} from '../../logic/dependencies/sampleTypes';
import {CompanyRepository} from '../../logic/repositories/companyRepository';
import {CompanyService} from '../../logic/services/companyService';
import {JsonFileReader} from '../../logic/utilities/jsonFileReader';
import {ClaimsController} from '../controllers/claimsController';
import {CompanyController} from '../controllers/companyController';
import {UserInfoController} from '../controllers/userInfoController';

/*
 * Compose the application's business dependencies
 */
export class CompositionRoot {

    /*
     * Register this API's dependencies, most of which will be recreated for each API request
     * Note that Inversify instantiates each per request object at application startup to create a dependency graph
     */
    public static registerDependencies(container: Container): void {

        // Controller classes have a REST based request scope
        container.bind<ClaimsController>(SAMPLETYPES.ClaimsController).to(ClaimsController).inRequestScope();
        container.bind<UserInfoController>(SAMPLETYPES.UserInfoController).to(UserInfoController).inRequestScope();
        container.bind<CompanyController>(SAMPLETYPES.CompanyController).to(CompanyController).inRequestScope();

        // Business logic classes use a non REST based transient scope
        container.bind<CompanyService>(SAMPLETYPES.CompanyService).to(CompanyService).inTransientScope();
        container.bind<CompanyRepository>(SAMPLETYPES.CompanyRepository).to(CompanyRepository).inTransientScope();
        container.bind<JsonFileReader>(SAMPLETYPES.JsonFileReader).to(JsonFileReader).inTransientScope();
    }
}
