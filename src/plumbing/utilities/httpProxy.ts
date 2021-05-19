import TunnelAgent from 'tunnel-agent';
import url from 'url';

/*
 * Manage supplying the HTTP proxy on calls from the API to the Authorization Server
 */
export class HttpProxy {

    private readonly _proxyUrl: string;
    private readonly _agent: any = null;

    public constructor(useProxy: boolean, proxyUrl: string) {

        this._proxyUrl = '';
        this._agent = null;
        this._setupCallbacks();

        if (useProxy) {
            const opts = url.parse(proxyUrl);
            this._proxyUrl = proxyUrl;
            this._agent = TunnelAgent.httpsOverHttp({
                proxy: opts,
            });
        }
    }

    /*
     * Set HTTP options as required by the Open ID Client library
     */
    public setOptions(options: any): any {

        options.agent = {
            https: this._agent,
        };

        return options;
    }

    /*
     * Return the URL when needed
     */
    public getUrl(): string {
        return this._proxyUrl;
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.setOptions = this.setOptions.bind(this);
    }
}
