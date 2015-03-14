# ti-stats-hook

Titanium CLI hook for stats monitor.

![ti-stats-hook.gif](ti-stats-hook.gif)

## Install

```
$ npm install -g ti-stats-hook
```

## Usage

### iOS

```
$ ti build -p ios --retina --tall --debug-host localhost:8888 --tistats
```

### Android

In development...

```
$ ti build -p android -C 'Nexus S - 4.1.1 - API 16 - 480x800' --debug-host 192.168.56.1:8888 --tistats
```

#### If does not launch of stats monitor

Please try this adb command.

```
$ adb forward --list
192.168.56.101:5555 tcp:8888 tcp:8888

$ adb forward --remove tcp:8888
```

## Change log

### 0.0.3

* **DRASTIC Change** build option ```--tistat localhost:8888``` to ```--debug-host localhost:8888 --tistats```
* Change the Titanium CLI hook event
* Android support in development

### 0.0.2

* No require TiStats module on your app

### 0.0.1

* initial commit

## Licence

The MIT License (MIT) Copyright (c) 2015 Kosuke Isobe