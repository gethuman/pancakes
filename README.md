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
};
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

There is no actual service object within a Pancakes app. Rather, a virtual service object is generated by Pancakes
on the fly based on the resource definition which then utilizes the appropriate adapter as the implementation
of that interface. So, for example, in your code you may have:

```javascript
module.exports = function (postService) {
    return {
        getQuestion: function (questionId) {
            return postService.findById({ _id: questionId });
        }
    }
};
```

There is no JavaScript file that contains the code for postService. The Pancakes dependency injector will construct
this object on the fly based on the following:

1. The current container name (i.e. api, webserver, batch, etc.) is passed into the Pancakes init()
1. Look at the post.resource file and gets the default adapter. For example, 'persist'.
1. Get all the methods and params for those methods with the default adapter.
1. The adapter mappings are passed into Pancakes init() to determine which implementation of the persist adapter
is used. For example, mongo.persist.adapter.
1. The adapter and the resource specific override are combined (ex. mongo.persist.adapter + post.persist.override)
1. A new service object is built that takes the methods (as defined in the resource file) from the chosen adapter

Some of the other things you can do include:

```javascript

// get specific adapters (i.e. don't just use the default for the given container)
module.exports = function (postPersistService, postSearchService) {};

// get a Model object which can be instantiated or use default service methods statically
module.exports = function (Post) {
    return {
        getQuestion: function (questionId) {
            Post.findById({ _id: questionId })
                .then(function (data) {
                    var post = new Post(data);
                    post.title = 'Updated title';
                    post.save();
                });
        }
    }
};

```

There are two fundamental type of services: Simple Services and Aggregation Services. Simple Services
will only end up calling 1 adapter method. This should be the bulk of your transactions since the assumption is
that your data has been heavily de-normalized. The Aggreation Services, however, call multiple other services.
In general, Pancakes prefers de-normalizing data so you can just make one call, but there will always be
certain use cases for making multiple back and calls.

Note that because service interfaces will be the same at any layer, this means that you could create an
Aggregation Service that is run on the client or the server. In other words, either your client
controller calls an Aggregation Service locally which subsequently makes multple
calls out to the back end API. Or, the client controller makes on service call which
goes to an Aggregation Service living within the API which then makes multiple Simple Service calls locally.

The sections below provide more details on each of service layers.

#### adapters

A _container_ is the context within which a program is run (ex. web server, browser, batch, integrated
circuit, etc.). An _adapter_ is a library that does the work to communicate between containers or from
one container to a different external service. Each adapter has a _type_ and an _implementation_.
For example, the following list are examples of mappings from adapter type to implementation:

* search : elasticsearch
* realtime : firebase
* email : mandrill
* analytics : google

The service to use these adapters follows this format:

{resource}{AdapterType}Service (ex. postSearchService, userRealtimeService, etc.)

As mentioned earlier, simply referencing {resource}Service will point to the default adapter service.
Within each adapter folder there are typically three files:

1. The adapter itself that contains the method implementations for a given interface (ex. create, update, remove, find)
1. Filters that are specific to the adapter type, but NOT the adapter implementation. Filters are simply data in,
data out either before or after an adapter method is called.
1. Wrapper classes that simply provide sugar and utility functionality for a given external system. So, these would
be lower level than the transactional method and closer tied to the target back end for that adapter.

#### resources

Each resource typically has three types of code files:

1. The resource definition itself which contains all the configuration for that resource.
1. Filter overrides for a given adapter. For example, post.persist.filters would override the adapter level persist.filters.
1. Adapter overrides. For example, post.persist.override would override the methods in mongo.persist.adapter.

For format of the resource file is still currently in flux, but it should eventually be somewhat standardized for
all Pancakes apps. Some examples of the type of data it contains:

* Default adapter for each potential container
* Methods to be exposed in the service interface for each adapter
* Required and optional params for each method
* API routes and how they map to the default service methods
* Primary database schema defintion
* Primary database schema indexes
* Security ACLs for data access
* Search and/or other database schema defintions
* Propagation info which determines how data copied to other tables/sources
* Data archiving and purging policies
* Data validations

Yes, this is a lot. However, outside some small validation logic, everything in the resource file should be
configuration and not code. Therefore, even the largest and most complex resource should not have a resource file
over 400 - 500 lines. The goal is to eventually get the Pancakes framework and the adapter layer so strong that
90% of non-UI development will only require a simple configuration change within the resource file.

### propagators

Data propagation is the asychronous replication and transformation of data from one location to another. There may
be some uses cases where specific code is needed, but for the large majority of situations the generic propagator
could be used to sync data. The further details of this layer are TBD>

## Routing

TBD; this will talk about the mechanism for how the server and client web UI will work off the same
routing configuration. On the server side, Hapi will leverage this routing config. On the client side,
the Angular UI Router will do the same.

## Controllers and Templates

TBD, but this is where we will talk about utilizing jeff.js to generate server and client side HTML
from the same templates. I will not be putting a lot of thought to this until April, but Christian
is working on the AngularJS plugin to jeff.js now.






