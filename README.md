# Cloud CORE

This Cost Optimization Resource Explorer helps you see realtime, resource-specific costs in your AWS accounts.

## Live Version

A live version of the master branch is available [here](https://tools.bluematador.com/cloud-core/).

## Run it Yourself

To run Cloud CORE yourself:

1. Clone the repo
1. Build the project with `npm run build`
1. Start an http server in `dist`. I like [http-server](https://github.com/http-party/http-server).

## Security

Here's how Cloud CORE handles security of sensitive AWS information:

* Your credentials are never transmitted anywhere. The API calls only require a signature, so the credentials aren't even sent to AWS.
* If you choose to store your credentials, they are encrypted using 256bit AES encryption with 1000 iterations.
* The encryption key is never stored or transmitted. Only you know the key.
* Your resource data is never stored or transmitted.

If you opt to use the [live version](https://tools.bluematador.com/cloud-core/)

* The live version is served over TLS.
* The live version is hosted and served using S3 and Cloudfront. There is no backend server to store information on.

## How does it work?

Cloud CORE is a single page webapp that collects your credentials and makes API requests to AWS in your browser.
Your resources are then displayed in a filterable, sortable table of results. The cost of each resource is displayed with the results.

[![Cloud CORE Introduction](https://img.youtube.com/vi/NHqnZRja7pM/0.jpg)](https://www.youtube.com/watch?v=NHqnZRja7pM)

## License

More details in [LICENSE](LICENSE).

Copyright (c) 2020 [Blue Matador, Inc.](https://www.bluematador.com)
