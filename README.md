# Cloud CORE

Tracking cloud inventory and costs in realtime isn't possible with any major cloud provider. There are a number of reasons for this.

* Your usage is elastic, including bandwidth, function invocations, IOPS, and more.
* Your credentials are widely distributed. Anyone can launch more resources at the drop of a hat.
* Your cloud footprint can easily extend beyond a single account at a single IaaS provider.

The major cloud providers provide tooling to get billing forecasts and historical costs, but they always fall short of providing helpful information on pinpointing waste and reducing your bill. They don't support multiple accounts and definitely don't dive into resource-specific usage.

So, we built this tool.

## Why "Cloud CORE"?

CORE is an acronym. The full name is "Cloud Cost Optimization Resource Explorer".

## What does it do?

It's a simple webpage that will query AWS for all your resources and usage, across all services and all regions, using IAM credentials supplied by you. Once the results are in, you can:

* Find the most costly resources in your account.
* Track inventory between regions and services.
* Project monthly costs based on instantaneous usage.
* Drill into specific resources and associated costs.

Overall, it's a great way to see what the cloud providers don't want you to see - how to reduce your cloud spend.

## What does it not do?

This tool is not a replacement for the cost explorer and bill forecasting tools from the cloud providers. As such, **it does not**:

* Track usage between refreshes.
* Make API calls on any sort of cronjob or frequency.
* Send notifications.
* Make any changes in your account or read sensitive or proprietary data.

## How do I use it?

You can access the current master build [here](https://tools.bluematador.com/cloud-core/).

To run it yourself, look at the [development instructions](DEVELOPING.md).

In the meantime, consider [contributing](CONTRIBUTING.md).

## License

More details in [LICENSE](LICENSE).

Copyright (c) 2020 [Blue Matador, Inc.](https://www.bluematador.com)
