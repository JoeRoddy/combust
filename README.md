# Combust

Command line tool for creating and prototyping full stack, serverless web and mobile apps.

## Example

`npm i -g combust`

`combust create myNewApp`

`cd myNewApp && npm start`

## Commands

<b>create</b>

`$ combust create`

<b>args</b>: app name (optional)

Creates a new project, you'll be prompted to chose a type (web, mobile, dual plat)

<b>configure</b>

`$ combust configure`

<b>args</b>: firebase projectId (optional)

Sets up your project with a firebase database, if no project is provided, you'll be prompted to choose from a list

<b>install</b>

`$ combust install moduleTitle`

<b>args</b>: moduleTitle (required)

Installs a combust module (this will alter your project's source code. [Available modules can be found here.](https://joeroddy.github.io/combust/modules.html)

<b>generate</b>

`$ combust generate newModule fieldName:dataType fieldName2:dataType`

<b>args</b>: moduleTitle (required), list of fieldName:dataType pairs (required)

<b>valid data types</b>: text, string, number, boolean, image

Generates front-end, data store, and view code for a new module.

<br><i>Extended Examples</i>

To create a blogging platform where blogs can have a title, a body, and a blog image, we would do something like:

`$ combust generate blogs title:string body:text blogImage:image`

To create a sports statistics tracking app, if we wanted players with stats, we could do something like:

`$ combust generate players firstName:string lastName:string profileImg:image bio:text age:number points:number gamesPlayed:number isActive:boolean isLeftHanded:boolean`
