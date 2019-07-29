# Combust

Combust is a command line tool for rapidly creating and prototyping serverless web and mobile apps.

## Installation

Due to [an issue](https://github.com/nodejs/node-gyp/issues/454) with node-gyp, we'll need to execute a funky install command.

```sh
sudo npm i --unsafe-perm -g combust --allow-root
```

## Setting up

```sh
combust create myNewApp
cd myNewApp && npm start
```

Your app will take you through a setup process once launched, or you can follow along with [this video.](https://youtu.be/NocD6ElmdF0?t=89)

## Commands

### create

```sh
combust create
```

<i>args:</i> app name (optional)

Creates a new project, you'll be prompted to choose a type (web, mobile, or dual platform)

### configure

```sh
combust configure
```

<i>args:</i> firebase projectId (optional)

Sets up your project with a firebase database, if no projectId is provided, you'll be prompted to choose one from a list

### install

```sh
combust install moduleTitle
```

<i>args:</i> moduleTitle (required)

Installs a combust module (this will alter your project's source code).
[Available modules can be found here.](https://joeroddy.github.io/combust/modules.html)

### generate

```sh
combust generate newModule fieldName:dataType fieldName2:dataType
```

<i>args:</i> moduleTitle (required), list of fieldName:dataType pairs (required)

<b>valid data types: text, string, number, image, and boolean (true/false)</b>

Generates the front-end, data store, and database code for a new feature.

#### Combust Generate Examples

To create a blogging platform, where blogs can have a title, a body, and a blog image, we would do something like:

```sh
combust generate blogs title:string body:text blogImage:image
```

To create a sports statistics tracking app, if we wanted players with stats, we could do something like:

```sh
combust generate players firstName:string lastName:string profileImg:image
bio:text age:number points:number gamesPlayed:number isActive:boolean
```
