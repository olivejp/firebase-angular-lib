# FirebaseAngularLib

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.0.0.

## Deployment

1-First of all, you should create and verify an user in https://www.npmjs.com/

Before the first deployment, go to the root project then type :

`npm adduser`

This way you tell npm wich user is connected and want to deploy.

Then you can build your library. Go to the root of the project and type :

`ng build`

Your library is ready in the /dist directory.

Change directory to :

`cd \dist\firebase-angular-lib`

Then type the following command to publish to npm.registry :

`npm publish`

## UPDATE : 25/08/2020 - Build and publish with schematics

If you want to buildyour project with schematics and publish the whole pack to npm

Upgrade your lib version in the firebase-angular-lib/package.json

Then call :

`npm run build-all-and-publish` 

To test your schematic go to .../project/firebase-angular-lib then call :

`ng generate firebase-angular-lib:my-service`

## Test in local

To test the library before publish it. You can go to the dist/firebase-angular-lib and type :

`npm link`

This will create a link to your local directory.

Then in your other project using your library go to the root and type :

`npm link firebase-angular-lib`

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
