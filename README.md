pancakes
========

**NOTE** - This is a work in progress and should not be used right now

Pancakes is a high-level, full-stack JavaScript framework. It was designed with the following
goals in mind:

1. **SEO** - Ability to pre-render content on the server, even for Single Page Apps. No need for PhantomJS or Fragment Spec hacks.
1. **DRY** - One template that can be rendered on the client or server. One module that
can be used at any layer. One common interface to multiple back ends. One unified Model object that
can be used anywhere (including all validations).
1. **Plugable Architecture** - Pancakes is not a web server framework. It is not a client side framework.
It is built to integration with any other framework on the web server (ex. Koa, Hapi, etc.) or the
client (ex. Angular, Backbone, etc.). Mix and match as you please!
1. **Testing** - Make it easy to unit test any and every module in the same way. Ability to test
 client side code on the server.
1. **Code Generation** - Heavy emphasis on auto generating scaffolding code and providing tools to
make development easy.

Although this framework is built for flexibility, it is opinionated. We will value making things
simple over providing options.

We are still working on making this library awesome, but we would love to know if you are interested
and would like to get involved. Hit me up on twitter @jeffwhelpley.

# Core Concepts

This section goes over a couple examples of how pancakes is used to get you familar with what it is all about
details for now to actually implement pancakes yourself will come later.

## 1. Dependency Injection

One of the core pieces of Pancakes is the Dependency Injector. All Pancakes code (event client side code) is
written "node style" (i.e. module.exports) with one exception. Normally dependencies in Node.js are pulled in
through require() like this:

```javascript
var Q = require('q');
var _ = require('lodash');
var myCoolUtil = require('../utils/my.cool.util');

module.exports = {
    someVal: myCoolUtil.getLatest(),
    someFunction: function (inputVal) { ... }
};

```

With Pancakes, you instead set module.exports to a function that contains all dependencies. The thing you would
normally set to module.exports is instead returned from the main function like this:

```javascript
module.exports = function (Q, _, myCoolUtil) {
    return {
        someVal: myCoolUtil.getLatest(),
        someFunction: function (inputVal) { ... }
    };
};
```

#### Why?

There are four primary reasons why Pancakes uses DI:

1. It enables us to easily generate client side code. Theoretically you should be able to generate any type of
client side code (ex. Backbone using AMD), but it is especially easy to translate into AngularJS because Angular
has a very similar idea of DI.
1. On the server side it allows us to create a number of 'virtual objects' that can be injected as needed (much more
on this in the 'Services' section below).
1. Super DRY code. You can easily create modules shared between client and server. Almost more importantly, you
will be coding in _almost the same way_ for all your code.
1. It makes testing a lot easier from two perspectives. On the Node.js side you can mock out all dependencies
without using something hacky like Mockery. For client side code, you can amazingly **unit test client code on
the server without a browser**!

#### How?

The DI figures out what to inject by the following (in order of decreasing priority):

1. Services - When Pancakes is initialized it will automatically crawl the Services directory and generate all the
service and model objects (more on this in the 'Services' section below).
1. Annotations - See next section on how this works
1. Mappings - You can pass specific mappings into Pancakes during initialization (ex. { 'SomeInput': 'utils/mystuff/some.input' })
1. Preloaded Dirs - A set of directories to recursively crawl can be passed into the Pancakes initialization. All
the mappings for the modules in these dirs will be pre-loaded
1. require() - If nothing else works, the default is to simply pass a lower case version of the param into require()

On the Node.js side, your entry point would call pancakes.init() passing in all the appropriate configurations and
then access the very first Pancakes module by using:

```javascript
var flapjack = pancakes.cook('utils/something');
```

This will kick off the recursive module loading process which attempts to instantiate the target module by doing the following:

1. Figure out where the target module lives
1. Do a normal require()
1. Get the params in the exported function
1. Recursively try to 'cook()' each of the params
1. Once all the downstream dependencies are resolved, call the target function passing in the resolved dependencies
1. Return back the resulting object

This process can be slightly different in certain cases or if the target object is 'virtual'. Also, note that for
the recursive cooking process, Pancakes will throw an error if it detects a circular dependency.

The client side code generation does the same #1 - #3 steps, but once the params are known it has a different process:

1. Look up the appropriate client template
1. Switch out the params for the mapped client values (ex. from config, Model may map to $scope on the client)
1. Pull from several other configurable values to get other data needed to render the template (ex. name of
the target Angular app, etc.)
1. Render the client side template

The build process can then treat this generated client code just like normal client code and do all the
subsequent stuff (i.e. client side testing, minification, etc.).

#### Annotations

In practice a large majority of the param mappings can and should be handled either through the directory preloading
process or the Pancakes initialization options. However, you can always override a mapping within a module itself
like this:

```javascript
module.exports = function (extender) {
    // @module({ "client": { "extender": "angular" }, "server": { "extender": "lodash" } })

    var val = {};
    extender.extend(val, { something: 'else' })
    return val;
}
```

This will allow you to have the same code for the client and server, but the input params actually come from
different sources. Note: while the general application of annotations are very useful, you should be careful
when you specifically try to do something like this above because the different objects injected on the client
and server could cause the code to behave in different ways.

## Services

At a high level, the idea is to create an ulta DRY business logic layer that can be used at **ALL** levels of
your system (i.e. API, web server, web client, browser, hardware integrated circuits, etc.). There are three
layers within the Services:

1. adapters - An adapter is a generic implementation of CRUD-like operations for a particular back end repository
or external service. So, for example, there may be a 'users' resource, but there would be a generic
'mongo.persist' adapter to save user info to mongo and an 'api' adapter call out to an API for /users.
1. resources - The layer contains objects that are specific to a business entity. Each resource has a configuration
file that contains all information needed to use that resource in all layers of your application. So, this includes
database schema fields, security ACLs, API endpoints, field validations, etc.
1. propagators - Pancakes assumes the use of NoSql and heavy de-normalization. In most cases data is both de-normalized
within one particular back end and copied to other back ends. While normal user-initiated, sychronous transactions
flow through resources and adapters, propagators are responsible for asychronously moving/copying/translating data to
other collections or backends.

The sections below provide more details on each of these layers.

#### adapters

TBD

#### resources

TBD

### adapters

TBD

## Routing

TBD; this will talk about the mechanism for how the server and client web UI will work off the same
routing configuration. On the server side, Hapi will leverage this routing config. On the client side,
the Angular UI Router will do the same.

## Controllers and Tempaltes

TBD, but this is where we will talk about utilizing jeff.js to generate server and client side HTML
from the same templates. I will not be putting a lot of thought to this until April, but Christian
is working on the AngularJS plugin to jeff.js now.






