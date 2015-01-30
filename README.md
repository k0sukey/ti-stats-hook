# ti-stats-hook

Titanium CLI hook for stats monitor.

![ti-stats-hook.gif](ti-stats-hook.gif)

## Install

```
$ npm install -g ti-stats-hook
```

## Usage

1. Install the [TiStats module](https://github.com/k0sukey/TiStats)
2. Load ```require('be.k0suke.tistats');``` on app.js or alloy.js
3. Build!

```
$ ti build -p ios --retina --tall --tistats localhost:8888
```

Please specify your favorite port.

## Licence

The MIT License (MIT) Copyright (c) 2015 Kosuke Isobe