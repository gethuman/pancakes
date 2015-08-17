pancakes
========

**NOTE**: This library is still under development and is not ready for use in the wild yet. I will post
instructions here once it is ready for anyone to try out.

-----

Pancakes is a high-level, full-stack JavaScript framework. It was designed with the following goals in mind:

1. **UX** - Ability to pre-render content on the server, even for Single Page Apps. No need for PhantomJS or Fragment Spec hacks.
1. **DRY** - One template that can be rendered on the client or server. One module that
can be used at any layer. One common interface to multiple back ends. One unified Model object that
can be used anywhere (including all validations).
1. **Plugable Architecture** - Pancakes is not a web server framework. It is not a client side framework.
It is really just glue code that can be used to integrate several different frameworks together. So you
could use React, Angular or Ember on the client and Express, Hapi or Koa on the server. Mix and match as you please!
1. **Testing** - Make it easy to unit test any and every module in the same way. Ability to test
 client side code on the server.
1. **Code Generation** - Heavy emphasis on auto generating scaffolding code and providing tools to
make development easy.

Although this library is built for flexibility, it is opinionated. We try to push opinions down to the adapters,
but even the core glue code will not be suitable for every situation.

We are still working on making this library awesome, but we would love to know if you are interested
and would like to get involved. Hit me up on twitter @jeffwhelpley. This README goes over the pancakes
framework and key concepts. If you would like a guide for actually using pancakes, go to
the [pancakes generator](https://github.com/gethuman/generator-pancakes).

# Inside Pancakes

This section goes over the code in Pancakes and how it is used. When reading this documentation
keep in mind that there is pancakes itself (which this section goes over) and then there are
the projects that use Pancakes (described in the Components section further down).

## Dependency Injection

One of the core pieces of Pancakes is the Dependency Injector. All Pancakes code (event client side code) is
written "node style" (i.e. module.exports). Normally dependencies in Node.js are pulled in
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

Under the scenes, the pancakes dependency injector utilizes a number of different DI factories. Each factory
knows how to convert certain parameters into certain modules. For example, the service.factory knows how
to convert any parameter that ends with the suffix 'Service' into an actual pancakes service.

#### Why?

There are four primary reasons why Pancakes uses DI:

1. It enables us to easily generate client side code. Theoretically you should be able to generate almost any type of
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

## Transformer

The pancakes framework will take generic modules written for pancakes and convert them into client side
code using a transformer. Currently most of the transformer code is project specific so it will reside within
the client project, however, pancakes has a base transformer class that contains the core utility methods
needed to construct a transformer.

## Utilities

Finally within the pancakes framework there are a couple utilities including:

* eventBus - a way of sending events between components
* utensils - utility methods for doing dependency injection and client side transformation
* annotationHelper - interprets annotations within modules (ex. // @module({ "server": { "somekey": "someval" } })
* debugHandler - pretty prints logs for pancakes and long error stack traces

# Pancakes Project Components

When you create a project that uses the pancakes framework it has the following components. Some of these componets
are a requirement whenever you use Pancakes, but some of it is just best practice.

## Services

At a high level, the idea is to create an ulta DRY business logic layer that can be used at **ALL** levels of
your system (i.e. API, web server, web client, browser, hardware integrated circuits, etc.). There are three
layers within the Services:

1. adapters - An adapter is a generic implementation of CRUD-like operations for a particular back end repository
or external service. So, for example, there are adapters for persist (saving to a database), search (using a search engine),
api (calling an api), realtime (using push notifications and subscriptions), etc. Each adapter has an implementation
(ex. MongoDB for persist, Firebase for realtime, etc.). A specific service, like userService, could then utilize any
of these adapters which each one storing the user data to different locations and in different ways.
1. filters - When a service method is called, the input and/or output data can be sent through filters which modify
the data and/or detect issues and throw errors when there are propblems. For example, the ACL filter will utilize
Fakeblock.js to throw an error if there are any security access issues with a given request.
1. reactors - Pancakes assumes the use of NoSql and heavy de-normalization. In most cases data is both de-normalized
within one particular back end and copied to other back ends. While normal user-initiated, sychronous transactions
flow through resources and adapters, propagators are responsible for asychronously moving/copying/translating data to
other collections or backends.
1. resources - The layer contains objects that are specific to a business entity. Each resource has a configuration
file that contains all information needed to use that resource in all layers of your application. So, this includes
database schema fields, security ACLs, API endpoints, field validations, etc. In addition to the actual resource
files which contain all this config data, there can be aggregate/override services that exist. For example,
postPersistService takes the persist adapter and overrides it with post-specific logic. Something like usernameService
is an aggregator that calls out to multiple other services.

When a client uses a service, they are actually using a virtual service object is generated by Pancakes
on the fly based on the resource definition which then utilizes the appropriate adapter as the implementation
of that interface and any overrides that may exist. So, for example, in your code you may have:

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
1. Look at the post.resource.js file and gets the default adapter. For example, 'persist'.
1. Get all the methods and params for those methods with the default adapter.
1. The adapter mappings are passed into Pancakes init() to determine which implementation of the persist adapter
is used. For example, mongo.persist.adapter.
1. The adapter and the resource specific override are combined (ex. mongo.persist.adapter + post.persist.service)
1. Filters used for a given service are gathered from the services/filters/filter.config.js file in your project.
1. A new service object is built that takes the methods (as defined in the resource file) from the chosen adapter
and override along with the appropriate filters.

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

With all of these examples, the generated client side code should look exactly the same except for the initial
function signature. For example, with Angular the Post example above would look like this:

```javascript
angular.module('someApp').factory(['Post', function (Post) {
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
}]);
```

While the server side 'Post' object wouldn't exist anywhere on the file system and is virtual, there actually
is a physical 'Post' object created for the client. The Pancakes build process generates an Angular
objects for all the services and models.

There are two fundamental type of services: Simple Services and Aggregation Services. Simple Services
will only end up calling 1 adapter method. This should be the bulk of your transactions since the assumption is
that your data has been heavily de-normalized. The Aggreation Services, however, call multiple other services.
In general, Pancakes prefers de-normalizing data so you can just make one call, but there will always be
certain use cases for making multiple back and calls.

The sections below provide more details on each of service layers.

#### adapters

A _container_ is the context within which a program is run (ex. web server, browser, batch, integrated
circuit, etc.). An _adapter_ is a library that does the work to communicate between containers or from
one container to a different external service. Each adapter has a _type_ and an _implementation_.
For example, the following list are examples of mappings from adapter type to implementation:

* search : elasticsearch
* realtime : firebase
* emailing : mandrill
* analytics : google

The service to use these adapters follows this format:

{resource}{AdapterType}Service (ex. postSearchService, userRealtimeService, etc.)

As mentioned earlier, simply referencing {resource}Service will point to the default adapter service.
Within each adapter folder there are typically two files:

1. The adapter itself that contains the method implementations for a given interface (ex. create, update, remove, find)
1. Wrapper classes that simply provide sugar and utility functionality for a given external system. So, these would
be lower level than the transactional method and closer tied to the target back end for that adapter.

#### resources

Each resource typically has three types of code files:

1. The resource definition itself which contains all the configuration for that resource.
1. Adapter overrides. For example, post.persist.service would override the methods in mongo.persist.adapter.
1. Aggregation services. For example. usernameService which uses the eventService and userService

Some examples of the type of data in the resource file includes:

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

### reactors

Data propagation is the asychronous replication and transformation of data from one location to another. All reactors
listen for events on the eventBus and then perform some asynchronous operation or operations. For example, the
audit reactor will watch for creation of update of data that is being audited and then copy that data to the audit
table. A number of reactions have been made generic and are part of the generic reactor including:

* newItem - Create new document in parent collection. For example, when a new tag is added to a question, that
tag needs to be added to the tag table as well.
* newListItem - Same as newItem except a new item in an array
* rollup - New document added to collection and then copied over to another collection with the local DB.
* replicate - New or updated data is copied to a remove repository.

### filters

Manipulate data and/or detect issues on the away in or out. Examples include: ACL fitlers for security
permissing enforcement, i18n fitlers for make sure internationalized verbiage is used, etc.

## apps

An "app" for a pancakes project contains all the routing, css, html and UI controller logic for
a website or application. The following sections detail some of the code that would be in an app folder.

### Routing

Each app has a {app name}.app.js file which contains routing information as well as some other config
data used when the app first fires up. The client project middleware code is responsible for rating this
data for the server side routing. The client transformer should generate code that pases the
routing data into the a client side component which can load routing data. For AngularJS, the state
loading process should ultimately use the Angular UI Router.

### Layouts, Pages and Partials

While these three concepts are similar they are 3 distinct entities in pancakes projects:

* Layouts - No logic, used just for CSS and HTML of the layout for an app. There can be multiple layouts
and/or nested layouts, but using more than one layout requires some manual effort to piece together.
* Pages - A page is an UI element that is specifically tied to a URL route. A page lives within zero or
more layouts and has zero or more partials within it. Pages have the following sections:
    * LESS - A separate file contains the styles for the page. Everything else is in the same code file.
    * model - The initial data needed to render a page. A page will not render until this data is resolved
    * serverPreprocessing - Server side code to do redirects or logic before the client loads
    * view - The jeff.js view code (see below)
    * controller - Client side logic for the page
* Partials - Partials are similar to pages except:
    * model returns a function that accepts the current model
    * No serverPreprocessing
    * Has scoping that will limit/alter the parent page model
    * Can exist within a layout, page or another partial and can have child partials

All three of these components utilize [Jyt, a JavaScript-based templating language](https://github.com/gethuman/jyt),
for the view layer. This library can be extended to for different types of client side frameworks, but currently
there is just one, [Jangular, which is an adapter for AngularJS](https://github.com/gethuman/jangular).

### Utilities and Other Client Code

All other code within the app layer is either generic utility code or client-only code. Utility code means
simple data in/data out without any major dependencies. Client-only code is code that is only relevant to
the client framework. For example, with Angular this may be something like a custom directive.

## Transformers

As explained in the pancakes framework section above, transformers convert a generic node-style module
into a client side module. So, for example, there may be a transformer called
ng.uipart.transformer which takes any page or partial module and uses ng.uipart.template to
genereate client side controllers, directives and template cache as appropriate for each
page and partial.

## Middleware

Middleware is technically not part of the pancakes framework, but it is worth noting that this is where
client projects should store all their non-app, non-pancakes-specific web server middleware code.
So, for example, if you use Hapi for your web server, all Hapi specific code would be under this folder
and it would call out to pancakes services.

# Resource Spec

A central piece of pancakes is the resource file. It contains many different configuration
options that are extremely powerful. Below is an example of a configuration file that contains
brief descriptions of what each value is used for.

```javascript
module.exports = function (_, fieldsets) {
    return {

        // the name will be the name of the database collection as well as the name of the API resource
        name: 'resourceName',

        // this flag can be used to indicate that changes should be kept in an audit table
        // this is an example of a custom attribute, however, because you would have to write the
        // code to save audit information yourself. pancakes just gives you the hooks to know when
        // something has changed
        audit: false,

        // default adapters for different containers (ex for api container default adapter is persist)
        adapters: {
            api:        'persist',  // so, within the API server, the persist adapter is used for this resource
            batch:      'persist',
            webserver:  'apiclient',  // on the web server or in the browser, a restful API call is made
            browser:    'apiclient'
        },

        // each adapter has a set of methods that can be exposed
        methods: {
            persist:    ['find', 'findById', 'create', 'update', 'remove'],
            apiclient:    ['find', 'findById', 'create', 'update', 'remove'],
            realtime:   ['save', 'remove'],
            search:     ['save', 'find', 'remove']
        },

        // for each method, there are required and options params
        params: {
            find:               { required: ['where'], optional: ['select', 'skip', 'limit', 'sort', 'findOne'] },
            'batch.find':       { required: ['where'] },    // this is an override of find() for the batch adapter
            findById:           { required: ['_id'], optional: ['select'] },
            create:             { required: ['data'] },
            update:             { eitheror: ['where', '_id'], required: ['data'], optional: ['select', 'multi', 'noaudit'] },
            remove:             { optional: ['host', 'token', 'url', 'data', 'multi', '_id', 'where'] }
        },

        // this defines the mapping from API endpoint to the service methods
        // the API middleware layer will automatically create endpoints based off of this
        api: {
            GET: {
                '/posts':       'find',
                '/posts/{_id}': 'findById'
            },
            POST: {
                '/posts':       'create'
            },
            PUT: {
                '/posts/{_id}': 'update'
            },
            DELETE: {
                '/posts/{_id}': 'remove'
            }
        },

        // database schema; for mongo, uses mongoose syntax
        fields: _.extend({}, fieldsets.page, fieldsets.workflow, {
            title: String

            // other field definitions (for mongo adapter, follows mongoose syntax)
        }),

        // database indexes (for mongo, in mongoose syntax)
        indexes: [
            {
                fields:     { modifyDate: 1, type: 1 },
                options:    { name: 'modifyDate_1_type_1' }
            }
        ],

        // security restrictions on a method by method basis (using fakeblock.js syntax)
        acl: {
            create: {
                access:             ['admin', 'user', 'visitor'],
                data: {
                    restricted: {
                        user:           ['answers', 'comments'],
                        visitor:        ['answers', 'comments']
                    }
                },
                values: {
                    restricted: {
                        visitor:    { type: ['question', 'answer', 'comment' ] }
                    }
                }
            },
            find: {
                access:             ['admin', 'user', 'visitor'],
                select: {
                    restricted: {
                        user:       ['author', 'modifyUserId'],
                        visitor:    ['author', 'modifyUserId']
                    },
                    'default': {
                        user:       ['-author', '-modifyUserId'],
                        visitor:    ['-author', '-modifyUserId']
                    }
                },
                where: {
                    allowed: {
                        allroles:   ['_id', 'parentId', 'createUserId', 'title', 'type',
                            'status', 'match', 'urlId', 'tags', 'company', 'offeringName',
                            'companySlug', 'offeringSlug', 'tags.slug']
                    }
                },
                sort: {
                    allowed: {
                        allroles:   ['createDate', 'stats.votes.sum']
                    }
                }
            },
            update: {
                access:             ['admin', 'user', 'visitor'],
                where: {
                    onlyMine: {
                        roles:      ['user', 'visitor'],
                        field:      'createUserId'
                    },
                    allowed: {
                        allroles:   ['_id', 'createUserId'],
                        admin:      ['_id', 'parentId', 'createUserId', 'title']
                    }
                },
                data: {
                    restricted: {
                        user:           ['answers', 'comments', 'urlId'],
                        visitor:        ['answers', 'comments', 'urlId']
                    }
                }
            },
            remove: {
                access:             ['admin', 'user', 'visitor'],
                where: {
                    onlyMine: {
                        roles:      ['user', 'visitor'],
                        field:      'createUserId'
                    }
                }
            }
        },

        // schema for search (if ElasticSearch adapter, uses ES format for type mappings)
        search: {
            types:  ['sometype'],
            fields: {
                type: { type: 'string', index: 'not_analyzed' }
            }
        },

        // this defines how data is copied to other data sources
        reactors: [
            {
                trigger: {
                    adapters:   ['persist'],
                    methods:    ['update']
                },
                type:           'newItem',
                target:         'company',
                name:           'company',
                slug:           'companySlug'
            }
        ],

        // asychronous workflow tasks triggered when user clicks on link in email that goes
        // to website; if link has token and task identifier, the middleware will
        // pick it up and use this configuration to automatically call out to the target method
        tasks: {
            confirmUsername: {
                method: 'confirmUsername',
                params: ['token'],
                notifySuccess: 'nameChange',    // note: look to notify.js for code that uses this on the client
                notifyFailure: 'nameErr'
            }
        }

        // define how/when data archived
        archive: {
            criteria: {
                status: ['deleted', 'rejected']
            },
            daysSinceMod: 365
        },

        // define how/when data purged from the database
        purge: {
            daysSinceMod: 600
        }
    };
};
```


