# oauth.apisample.nodejs

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/4e685ae1d0ae4d3091e0dccd5b3cd011)](https://www.codacy.com/gh/gary-archer/oauth.apisample.nodejs/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=gary-archer/oauth.apisample.nodejs&amp;utm_campaign=Badge_Grade) 

[![Known Vulnerabilities](https://snyk.io/test/github/gary-archer/oauth.apisample.nodejs/badge.svg?targetFile=package.json)](https://snyk.io/test/github/gary-archer/oauth.apisample.nodejs?targetFile=package.json)

### Overview

The Final NodeJS API code sample using OAuth and Open Id Connect, referenced in my blog at https://authguidance.com:

- The API takes finer control over OAuth processing via a filter, implemented with certified libraries
- The API also implements other [Non Functional Behaviour](https://authguidance.com/2017/10/08/corporate-code-sample-core-behavior/), to enable productivity and quality

### Details

* See the [Overview Page](https://authguidance.com/2017/10/27/api-architecture-node) for an overview and how to run the API
* See the [Coding Key Points Page](https://authguidance.com/2017/10/27/final-nodeapi-coding-key-points/) for design aspects

### Programming Languages

* NodeJS with TypeScript is used for the API

### Middleware Used

* Express is used to host the API over SSL, using OpenSSL self signed certificates
* AWS Cognito is used as the default Authorization Server
* The [JSON Web Token Library](https://github.com/auth0/node-jsonwebtoken) is used for in memory validation of JWTs
* The [JWKS RSA Library](https://github.com/auth0/node-jwks-rsa) is used for efficient download of JWT public keys
* The [OpenId-Client Library](https://github.com/panva/node-openid-client) is used for other OAuth operations
* [Inversify](http://inversify.io) is used to manage dependencies in line with other development languages
* API logs can be aggregated to [Elastic Search](https://authguidance.com/2019/07/19/log-aggregation-setup/) to support [Query Use Cases](https://authguidance.com/2019/08/02/intelligent-api-platform-analysis/)

### SSL Certificates

* Certificates in the certs folder originate from the [OAuth Development Certificates](https://github.com/gary-archer/oauth.developmentcertificates) repository
