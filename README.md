# Firefly Animation

Best way to summarize your year of activities.

## Examples

Pili's single record of [Tianfu Greeway 100K](https://fastestknowntime.com/route/round-chengdu-100-tianfu-greenway):

![pili chengdu 100K](https://github.com/irunart/firefly-animation/assets/1227160/0bc4881c-1d5c-4ab9-a3fb-555c29112469)

Pili's 2023 running log in Hong Kong:

![firefly_animation_sample](https://github.com/irunart/firefly-animation/assets/1227160/427e9e1b-e721-4921-90be-dfc6bb26783d)

## Prepare

You need to prepare a mapbox token to start this project, which can be obtained from [mapbox.com](https://docs.mapbox.com/help/getting-started/access-tokens/). And configure it like the following:

```
export FF_MAPBOX_TOKEN=...
```

## Get Started

```
yarn && yarn dev
```

## Deploy

```
./deploy.sh
```

OR

```
TARGET_PATH=/path/to/html FIREFLY_PATH=/path/to/html/firefly_animation ./deploy.sh
```

The `install.sh` script will automatically download the required static files
and install them into the `html` directory by default. You can change the
target path using environment variables, see the script for details.
